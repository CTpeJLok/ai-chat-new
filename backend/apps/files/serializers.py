from rest_framework import serializers

from .models import File


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    size = serializers.SerializerMethodField()
    name = serializers.CharField(required=False)

    class Meta:
        model = File
        fields = ["id", "name", "file", "size", "uploaded_by_username", "created_at"]

    def get_size(self, obj):
        try:
            return obj.file.size
        except Exception:
            return None
