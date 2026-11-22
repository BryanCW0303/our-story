from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Photo, Place, SiteConfig
from .serializers import PhotoSerializer, PlaceSerializer, SiteConfigSerializer, UploadSerializer


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
    throttle_scope = "login"

    def get_throttles(self):
        from rest_framework.throttling import ScopedRateThrottle

        return [ScopedRateThrottle()]

    def post(self, request):
        user = authenticate(
            request,
            username=str(request.data.get("username", "")),
            password=str(request.data.get("password", "")),
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


def _visible_photos(request):
    """Visitors only ever see public photos; logged-in members see all of them."""
    photos = Photo.objects.select_related("note_by")
    return photos if request.user.is_authenticated else photos.filter(is_public=True)


class PlaceListView(generics.ListAPIView):
    serializer_class = PlaceSerializer
    pagination_class = None

    def get_queryset(self):
        # The count must not reveal how many private photos a place has.
        visible = None if self.request.user.is_authenticated else Q(photos__is_public=True)
        # Explicit order_by: Django drops Meta.ordering once a query is grouped.
        return Place.objects.annotate(photo_count=Count("photos", filter=visible)).order_by("order", "id")


class PlacePhotosView(generics.ListAPIView):
    """GET: every photo of one place, oldest first. POST: upload one more."""

    serializer_class = PhotoSerializer
    pagination_class = None
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        place = get_object_or_404(Place, slug=self.kwargs["slug"])
        return _visible_photos(self.request).filter(place=place)

    def post(self, request, slug):
        place = get_object_or_404(Place, slug=slug)
        upload = request.FILES.get("image")
        if upload is None:
            return Response({"detail": "沒有收到照片"}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > settings.MAX_PHOTO_BYTES:
            return Response({"detail": "照片太大了"}, status=status.HTTP_400_BAD_REQUEST)
        fields = UploadSerializer(data=request.data)
        fields.is_valid(raise_exception=True)
        try:
            photo = Photo.from_upload(
                place,
                upload,
                fallback_date=fields.validated_data.get("taken_on") or timezone.localdate(),
                note=fields.validated_data.get("note", ""),
                is_public=str(request.data.get("is_public", "true")).lower() not in ("false", "0", ""),
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
        return _visible_photos(self.request)

    def perform_update(self, serializer):
        note = serializer.validated_data.get("note")
        if note is not None and note != serializer.instance.note:
            # Whoever last rewrote the note signs it.
            serializer.save(note_by=self.request.user if note else None)
        else:
            serializer.save()


def media(request, path):
    """Serve an uploaded photo, hiding private photos from visitors."""
    photo = Photo.objects.filter(Q(image=path) | Q(thumb=path)).first()
    if photo is None or not (photo.is_public or request.user.is_authenticated):
        raise Http404
    field = photo.image if photo.image.name == path else photo.thumb
    try:
        response = FileResponse(field.open("rb"), content_type="image/jpeg")
    except FileNotFoundError as exc:
        raise Http404 from exc
    # File names are random and never reused, so the browser may keep its copy.
    response["Cache-Control"] = "private, max-age=604800"
    return response
