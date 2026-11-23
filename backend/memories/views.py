from collections import defaultdict

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Max, Min, Q
from django.db.models.functions import TruncMonth
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, serializers, status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Photo, Place, Restaurant, SiteConfig
from .serializers import (
    PhotoSerializer,
    PlaceSerializer,
    RestaurantSerializer,
    SiteConfigSerializer,
    UploadSerializer,
)


def _session_payload(request):
    user = request.user
    return {"authenticated": user.is_authenticated, "username": user.get_username() if user.is_authenticated else ""}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Who am I? Also hands the browser its CSRF cookie on first load."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(_session_payload(request))


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        # A body that is valid JSON but not an object (a list, a number) carries no credentials.
        data = request.data if isinstance(request.data, dict) else {}
        user = authenticate(
            request,
            username=str(data.get("username", "")),
            password=str(data.get("password", "")),
        )
        if user is None:
            return Response({"detail": "帳號或密碼不正確"}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response(_session_payload(request))


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(_session_payload(request))


class SiteConfigView(generics.RetrieveUpdateAPIView):
    serializer_class = SiteConfigSerializer

    def get_object(self):
        return SiteConfig.load()


class PlaceListView(generics.ListAPIView):
    serializer_class = PlaceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        trip_months = defaultdict(list)
        months = (Photo.objects.filter(place__kind=Place.Kind.TRIP)
                  .annotate(month=TruncMonth("taken_on"))
                  .values_list("place_id", "month").order_by("place_id", "month").distinct())
        for place_id, month in months:
            trip_months[place_id].append(month.strftime("%Y-%m"))
        context["trip_months"] = trip_months
        return context

    def get_queryset(self):
        # Explicit order_by: Django drops Meta.ordering once a query is grouped.
        # distinct: joining both photos and restaurants would otherwise multiply each count by the other.
        return Place.objects.annotate(
            photo_count=Count("photos", distinct=True),
            restaurant_count=Count("restaurants", distinct=True),
            first_photo=Min("photos__taken_on"),
            last_photo=Max("photos__taken_on"),
        ).order_by("order", "id")


class PlacePhotosView(generics.ListAPIView):
    """GET: every photo of one place, oldest first. POST: upload one more."""

    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        place = get_object_or_404(Place, slug=self.kwargs["slug"])
        return Photo.objects.select_related("note_by").filter(place=place)

    def post(self, request, slug):
        place = get_object_or_404(Place, slug=slug)
        upload = request.FILES.get("image")
        if upload is None:
            return Response({"detail": "沒有收到照片"}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > settings.MAX_PHOTO_BYTES:
            return Response({"detail": "每張照片最多 80 MiB"}, status=status.HTTP_400_BAD_REQUEST)
        fields = UploadSerializer(data=request.data)
        fields.is_valid(raise_exception=True)
        try:
            photo = Photo.from_upload(
                place,
                upload,
                fallback_date=fields.validated_data.get("taken_on") or timezone.localdate(),
                note=fields.validated_data.get("note", ""),
                user=request.user,
            )
        except ValueError:
            return Response({"detail": "這個檔案不是可以讀取的照片"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class PhotoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH changes the note, the date or who can see it; DELETE removes the photo and its files."""

    serializer_class = PhotoSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Photo.objects.select_related("note_by")

    def perform_update(self, serializer):
        note = serializer.validated_data.get("note")
        if note is not None and note != serializer.instance.note:
            # Whoever last rewrote the note signs it.
            serializer.save(note_by=self.request.user if note else None)
        else:
            serializer.save()


def _set_cover(request, restaurant):
    """Attach the uploaded cover picture, if the request carries one."""
    upload = request.FILES.get("image")
    if upload is None:
        return
    if upload.size > settings.MAX_COVER_BYTES:
        raise serializers.ValidationError({"image": ["照片太大了"]})
    try:
        restaurant.set_cover(upload)
    except ValueError as exc:
        raise serializers.ValidationError({"image": ["這個檔案不是可以讀取的照片"]}) from exc


class PlaceRestaurantsView(generics.ListCreateAPIView):
    """GET: the favourite restaurants of one place, in the order they were added. POST: add one."""

    serializer_class = RestaurantSerializer
    parser_classes = [MultiPartParser, JSONParser]

    def get_queryset(self):
        place = get_object_or_404(Place, slug=self.kwargs["slug"])
        return Restaurant.objects.select_related("note_by").filter(place=place)

    def perform_create(self, serializer):
        place = get_object_or_404(Place, slug=self.kwargs["slug"])
        user = self.request.user
        fields = serializer.validated_data
        restaurant = Restaurant(place=place, added_by=user, note_by=user if fields.get("note") else None, **fields)
        _set_cover(self.request, restaurant)
        restaurant.save()
        serializer.instance = restaurant


class RestaurantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH changes the details, the note or the cover picture; DELETE removes the restaurant and its files."""

    queryset = Restaurant.objects.select_related("note_by")
    serializer_class = RestaurantSerializer
    parser_classes = [MultiPartParser, JSONParser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def perform_update(self, serializer):
        restaurant = serializer.instance
        extra = {}
        note = serializer.validated_data.get("note")
        if note is not None and note != restaurant.note:
            extra["note_by"] = self.request.user if note else None  # whoever last rewrote the note signs it
        _set_cover(self.request, restaurant)
        serializer.save(**extra)


def media(request, path):
    """Serve uploaded photos and restaurant covers to signed-in members."""
    if not request.user.is_authenticated:
        raise Http404
    photo = Photo.objects.filter(Q(image=path) | Q(thumb=path)).first()
    if photo is None:
        photo = Restaurant.objects.filter(Q(image=path) | Q(thumb=path)).first()
        if photo is None:
            raise Http404
    field = photo.image if photo.image.name == path else photo.thumb
    try:
        response = FileResponse(field.open("rb"), content_type="image/jpeg")
    except FileNotFoundError as exc:
        raise Http404 from exc
    return response
