from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from ..models import NOTE_MAX, Photo, Place
from .notes import SignedNoteSerializer


class PhotoSerializer(SignedNoteSerializer):
    # Relative URLs so the same data works behind the dev proxy and the tunnel.
    image = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", "image", "thumb", "width", "height", "taken_on", "note", "note_by"]
        read_only_fields = ["width", "height"]

    def get_image(self, photo):
        return photo.image.url

    def get_thumb(self, photo):
        return photo.thumb.url


class UploadSerializer(serializers.Serializer):
    """The form fields sent along with an uploaded image."""

    taken_on = serializers.DateField(required=False)
    note = serializers.CharField(allow_blank=True, max_length=NOTE_MAX, trim_whitespace=True, required=False)


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
    """PATCH changes the note or the date; DELETE removes the photo and its files."""

    serializer_class = PhotoSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Photo.objects.select_related("note_by")
