from rest_framework import generics, serializers

from ..models import SiteConfig


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = ["title", "name_a", "name_b", "start_date", "anniversary_timezone", "reunion_date", "reunion_city"]

    def validate(self, attrs):
        if "reunion_date" in attrs or "reunion_city" in attrs:
            if not attrs.get("reunion_date") or not attrs.get("reunion_city"):
                raise serializers.ValidationError("請同時填寫見面日期和地點")
        return attrs

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(update_fields=list(validated_data))
        instance.refresh_from_db()
        return instance


class SiteConfigView(generics.RetrieveUpdateAPIView):
    serializer_class = SiteConfigSerializer

    def get_object(self):
        return SiteConfig.load()
