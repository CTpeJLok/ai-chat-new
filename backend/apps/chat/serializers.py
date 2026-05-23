from rest_framework import serializers

from .models import Conversation, Message


class MessageSourceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class MessageSerializer(serializers.ModelSerializer):
    sources = MessageSourceSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ["id", "role", "content", "sources", "created_at"]


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    messages_count = serializers.IntegerField(source="messages.count", read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "space", "space_id", "created_at", "last_message", "messages_count"]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if not msg:
            return None
        return {
            "role": msg.role,
            "content": msg.content[:100],
            "created_at": msg.created_at,
        }


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "space", "created_at", "messages"]
