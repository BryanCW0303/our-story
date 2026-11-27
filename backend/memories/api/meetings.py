from rest_framework import generics, serializers

from ..models import Meeting


class MeetingSerializer(serializers.ModelSerializer):
    days = serializers.IntegerField(read_only=True)

    class Meta:
        model = Meeting
        fields = ["id", "start_date", "end_date", "location", "days"]

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "結束日期不可早於起始日期"})
        return attrs


class MeetingsView(generics.ListCreateAPIView):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
