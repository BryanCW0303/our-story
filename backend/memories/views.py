from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Moment, Photo, SiteConfig
from .serializers import MomentSerializer, PhotoSerializer, SiteConfigSerializer


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


class MomentViewSet(viewsets.ModelViewSet):
    serializer_class = MomentSerializer

    def get_queryset(self):
        queryset = Moment.objects.select_related("created_by").prefetch_related("photos")
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(is_public=True)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def photos(self, request, pk=None):
        moment = self.get_object()
        upload = request.FILES.get("image")
        if upload is None:
            return Response({"detail": "沒有收到照片"}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > settings.MAX_PHOTO_BYTES:
            return Response({"detail": "照片太大了"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            photo = Photo.from_upload(moment, upload)
        except ValueError:
            return Response({"detail": "這個檔案不是可以讀取的照片"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class PhotoDeleteView(generics.DestroyAPIView):
    queryset = Photo.objects.all()
    permission_classes = [permissions.IsAuthenticated]


def media(request, path):
    """Serve an uploaded photo, hiding photos of private moments from visitors."""
    photo = Photo.objects.select_related("moment").filter(Q(image=path) | Q(thumb=path)).first()
    if photo is None or not (photo.moment.is_public or request.user.is_authenticated):
        raise Http404
    field = photo.image if photo.image.name == path else photo.thumb
    try:
        response = FileResponse(field.open("rb"), content_type="image/jpeg")
    except FileNotFoundError as exc:
        raise Http404 from exc
    # File names are random and never reused, so the browser may keep its copy.
    response["Cache-Control"] = "private, max-age=604800"
    return response
