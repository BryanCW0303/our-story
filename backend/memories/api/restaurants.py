from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.parsers import JSONParser, MultiPartParser

from ..models import Place, Restaurant
from .notes import SignedNoteSerializer


class RestaurantSerializer(SignedNoteSerializer):

    class Meta:
        model = Restaurant
        fields = ["id", "name", "must_order", "note", "note_by"]


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
        serializer.save(place=place, added_by=user, note_by=user if serializer.validated_data.get("note") else None)


class RestaurantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Update restaurant details and notes, or remove a restaurant."""

    queryset = Restaurant.objects.select_related("note_by")
    serializer_class = RestaurantSerializer
    parser_classes = [MultiPartParser, JSONParser]
    http_method_names = ["get", "patch", "delete", "head", "options"]
