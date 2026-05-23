# chat/views.py
import json

from apps.chat.models import Conversation, Message
from apps.chat.serializers import ConversationListSerializer
from django.http import StreamingHttpResponse
from openai import OpenAI
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ConversationSerializer

client = OpenAI()


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ConversationListSerializer
        return ConversationSerializer

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user)
        space_id = self.request.query_params.get("space_id")
        if space_id:
            qs = qs.filter(space_id=space_id)
        return qs.prefetch_related("messages").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)


class ChatStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        conversation_id = data.get("conversation_id")
        user_message = request.data.get("message", "").strip()
        space_id = data.get("space_id")

        if not user_message:
            return Response({"error": "Пустое сообщение"}, status=400)

        try:
            conv = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Диалог не найден"}, status=404)

        Message.objects.create(conversation=conv, role="user", content=user_message)

        history = list(conv.messages.values("role", "content").order_by("created_at"))

        context = self._get_rag_context(user_message, space_id)

        system_prompt = (
            f"Ты — помощник. Отвечай на русском языке.\n\nКонтекст из файлов пространства:\n{context}"
            if context
            else "Ты — помощник. Отвечай на русском языке."
        )

        def event_stream():
            full_response = []
            try:
                stream = client.chat.completions.create(
                    model="gpt-5",
                    stream=True,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        *[{"role": m["role"], "content": m["content"]} for m in history],
                    ],
                )
                for chunk in stream:
                    if not chunk.choices:
                        break
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        full_response.append(delta)
                        yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                if full_response:
                    Message.objects.create(
                        conversation=conv,
                        role="assistant",
                        content="".join(full_response),
                    )
                yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    def _get_rag_context(self, query, space_id) -> str:
        return ""
