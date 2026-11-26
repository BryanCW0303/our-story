from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AnniversaryDisplay, Photo


class LocalDaySerializer(serializers.Serializer):
    local_day = serializers.DateField()


class AnniversaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        fields = LocalDaySerializer(data=request.data)
        fields.is_valid(raise_exception=True)
        day = fields.validated_data["local_day"]
        try:
            anniversary = day.replace(year=day.year - 1)
        except ValueError:  # No matching calendar day last year (February 29).
            return Response([])

        displays = AnniversaryDisplay.objects.filter(user=request.user, local_day=day)
        if displays.exists():
            return Response([])
        photos = [
            {"id": photo.id, "city": photo.place.name, "date": photo.taken_on.isoformat(),
             "image": photo.image.url, "note": photo.note}
            for photo in Photo.objects.filter(taken_on=anniversary).select_related("place").order_by("id")
        ]
        if not photos:
            return Response([])
        # Two devices can arrive together. Only the one that inserts the unique row opens the dialog.
        _, first = AnniversaryDisplay.objects.get_or_create(user=request.user, local_day=day)
        return Response(photos if first else [])
