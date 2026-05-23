from django.contrib import admin

from . import models


@admin.register(models.File)
class FileAdmin(admin.ModelAdmin):
    raw_id_fields = ["space", "uploaded_by"]
