from rest_framework import generics, serializers

from ..models import SiteConfig


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ["title", "name_a", "name_b", "start_date"]


class SiteConfigView(generics.RetrieveUpdateAPIView):
    serializer_class = SiteConfigSerializer

    def get_object(self):
        return SiteConfig.load()
