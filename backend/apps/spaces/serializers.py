from rest_framework import serializers

from .models import Space


class SpaceSerializer(serializers.ModelSerializer):
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = Space
        fields = ["id", "name", "created_at", "is_member"]

    def get_is_member(self, obj):
        user = self.context["request"].user
        return obj.members.filter(user=user).exists() or obj.owner_id == user.id


class SpaceCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)

    class Meta:
        model = Space
        fields = ["id", "name", "password"]
