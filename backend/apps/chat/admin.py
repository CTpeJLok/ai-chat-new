from django.contrib import admin

from . import models


class MessageInline(admin.StackedInline):
    model = models.Message
    extra = 0
    raw_id_fields = ["conversation"]


@admin.register(models.Conversation)
class ConversationAdmin(admin.ModelAdmin):
    raw_id_fields = ["user", "space"]
    inlines = [MessageInline]
