from rest_framework import serializers

from ..models import NOTE_MAX


class SignedNoteSerializer(serializers.ModelSerializer):
    """Photos and restaurants sign a changed note with the editing member's name."""

    note = serializers.CharField(allow_blank=True, max_length=NOTE_MAX, trim_whitespace=True, required=False)
    note_by = serializers.SerializerMethodField()

    def get_note_by(self, entry):
        author = entry.note_by
        return (author.first_name or author.get_username()) if entry.note and author else ""

    def update(self, instance, validated_data):
        note = validated_data.get("note")
        if note is not None and note != instance.note:
            validated_data["note_by"] = self.context["request"].user if note else None
        return super().update(instance, validated_data)
