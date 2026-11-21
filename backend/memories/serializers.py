from rest_framework import serializers

from .models import Moment, Photo, SiteConfig


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ["title", "name_a", "name_b", "start_date"]


class PhotoSerializer(serializers.ModelSerializer):
    # Relative URLs so the same data works behind the dev proxy and the tunnel.
    image = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", "image", "thumb", "width", "height"]

    def get_image(self, photo):
        return photo.image.url

    def get_thumb(self, photo):
        return photo.thumb.url


class MomentSerializer(serializers.ModelSerializer):
    photos = PhotoSerializer(many=True, read_only=True)
    author = serializers.CharField(source="created_by.username", read_only=True, default="")

    class Meta:
        model = Moment
        fields = ["id", "title", "date", "location", "description", "is_public", "photos", "author"]
