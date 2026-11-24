from collections import defaultdict

from django.db.models import Count, Max, Min
from django.db.models.functions import TruncMonth
from rest_framework import generics, serializers

from ..models import Photo, Place


class PlaceSerializer(serializers.ModelSerializer):
    # Annotated by the view; the dates are those of the earliest and latest visible photo.
    photo_count = serializers.IntegerField(read_only=True)
    restaurant_count = serializers.IntegerField(read_only=True)
    first_photo = serializers.DateField(read_only=True)
    last_photo = serializers.DateField(read_only=True)
    photo_months = serializers.SerializerMethodField()
    trip_months = serializers.SerializerMethodField()

    def get_trip_months(self, place):
        return self.get_photo_months(place) if place.kind == Place.Kind.TRIP else []

    def get_photo_months(self, place):
        return self.context["photo_months"].get(place.pk, [])

    class Meta:
        model = Place
        fields = ["slug", "name", "name_en", "kind", "color", "photo_count", "restaurant_count", "first_photo", "last_photo", "trip_months", "photo_months"]


class PlaceListView(generics.ListAPIView):
    serializer_class = PlaceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        photo_months = defaultdict(list)
        months = (Photo.objects
                  .annotate(month=TruncMonth("taken_on"))
                  .values_list("place_id", "month").order_by("place_id", "month").distinct())
        for place_id, month in months:
            photo_months[place_id].append(month.strftime("%Y-%m"))
        context["photo_months"] = photo_months
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
