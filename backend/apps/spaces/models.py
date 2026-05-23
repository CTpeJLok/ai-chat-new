from apps.accounts.models import User
from django.db import models


class Space(models.Model):
    name = models.CharField(max_length=255)
    password = models.CharField(max_length=128)  # hashed
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_spaces")
    created_at = models.DateTimeField(auto_now_add=True)

    members: models.QuerySet["SpaceMember"]

    def __str__(self):
        return self.name


class SpaceMember(models.Model):
    space = models.ForeignKey(Space, models.CASCADE, related_name="members")
    user = models.ForeignKey(User, models.CASCADE, related_name="spaces")
