from django.db import models

from apps.accounts.models import User
from apps.files.models import File
from apps.spaces.models import Space


class Conversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    space = models.ForeignKey(Space, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    messages: models.QuerySet["Message"]

    class Meta:
        ordering = ["-created_at"]


class Message(models.Model):
    ROLES = [("user", "User"), ("assistant", "Assistant")]
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    sources = models.ManyToManyField(File, blank=True, related_name="messages")

    class Meta:
        ordering = ["created_at"]
