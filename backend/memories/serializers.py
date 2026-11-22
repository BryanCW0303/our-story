from rest_framework import serializers

from .models import NOTE_MAX, Photo, Place, Restaurant, SiteConfig


def display_name(user):
    """The name signed under a note: the account's first name if set, else its username."""
    if user is None:
        return ""
    return user.first_name or user.get_username()


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ["title", "name_a", "name_b", "start_date"]


class PlaceSerializer(serializers.ModelSerializer):
    # Annotated by the view; the dates are those of the earliest and latest visible photo.
    photo_count = serializers.IntegerField(read_only=True)
    restaurant_count = serializers.IntegerField(read_only=True)
    first_photo = serializers.DateField(read_only=True)
    last_photo = serializers.DateField(read_only=True)

    class Meta:
        model = Place
        fields = ["slug", "name", "name_en", "kind", "color", "photo_count", "restaurant_count", "first_photo", "last_photo"]


class PhotoSerializer(serializers.ModelSerializer):
    # Relative URLs so the same data works behind the dev proxy and the tunnel.
    image = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()
    note = serializers.CharField(allow_blank=True, max_length=NOTE_MAX, trim_whitespace=True, required=False)
    note_by = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", "image", "thumb", "width", "height", "taken_on", "note", "note_by", "is_public"]
        read_only_fields = ["width", "height"]

    def get_image(self, photo):
        return photo.image.url

    def get_thumb(self, photo):
        return photo.thumb.url

    def get_note_by(self, photo):
        return display_name(photo.note_by) if photo.note else ""


class RestaurantSerializer(serializers.ModelSerializer):
    # The cover is optional, so both URLs can be null.
    image = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()
    note = serializers.CharField(allow_blank=True, max_length=NOTE_MAX, trim_whitespace=True, required=False)
    note_by = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = ["id", "name", "cuisine", "location", "must_order", "image", "thumb", "note", "note_by"]

    def get_image(self, restaurant):
        return restaurant.image.url if restaurant.image else None

    def get_thumb(self, restaurant):
        return restaurant.thumb.url if restaurant.thumb else None

    def get_note_by(self, restaurant):
        return display_name(restaurant.note_by) if restaurant.note else ""


class UploadSerializer(serializers.Serializer):
    """The form fields sent along with an uploaded image."""

    taken_on = serializers.DateField(required=False)
    note = serializers.CharField(allow_blank=True, max_length=NOTE_MAX, trim_whitespace=True, required=False)
