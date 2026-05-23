from apps.spaces.models import Space
from rest_framework.permissions import BasePermission


class IsSpaceMember(BasePermission):
    def has_permission(self, request, view):
        space_id = view.kwargs.get("space_id") or request.data.get("space_id") or request.query_params.get("space_id")
        if not space_id:
            return False
        try:
            space = Space.objects.get(pk=space_id)
        except Space.DoesNotExist:
            return False
        return space.owner == request.user or space.members.filter(user=request.user).exists()
