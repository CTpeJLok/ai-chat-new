from django.contrib import admin

from . import models


class SpaceMemberInline(admin.TabularInline):
    model = models.SpaceMember
    extra = 0
    raw_id_fields = ["space", "user"]


@admin.register(models.Space)
class SpaceAdmin(admin.ModelAdmin):
    raw_id_fields = ["owner"]
    inlines = [SpaceMemberInline]
