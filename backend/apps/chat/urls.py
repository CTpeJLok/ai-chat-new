from apps.chat.views import ConversationDetailView
from django.urls import path

from .views import ChatStreamView, ConversationListCreateView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view()),
    path("conversations/<int:pk>/", ConversationDetailView.as_view()),
    path("stream/", ChatStreamView.as_view()),
]
