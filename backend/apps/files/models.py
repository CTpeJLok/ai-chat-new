from django.db import models

from apps.accounts.models import User
from apps.spaces.models import Space


class File(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name="files")
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="files/%Y/%m/")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
