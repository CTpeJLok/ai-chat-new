from apps.spaces.models import SpaceMember
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Space
from .serializers import SpaceCreateSerializer, SpaceSerializer


class SpaceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SpaceCreateSerializer
        return SpaceSerializer

    def get_queryset(self):
        qs = Space.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by("name")

    def perform_create(self, serializer):
        raw_password = serializer.validated_data.pop("password")
        space: Space = serializer.save(
            owner=self.request.user,
            password=make_password(raw_password),
        )
        SpaceMember.objects.create(space=space, user=self.request.user)


class SpaceJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            space: Space = Space.objects.get(pk=pk)
        except Space.DoesNotExist:
            return Response({"error": "Пространство не найдено"}, status=404)

        if not check_password(request.data.get("password", ""), space.password):
            return Response({"error": "Неверный пароль"}, status=400)

        SpaceMember.objects.create(space=space, user=request.user)
        return Response(SpaceSerializer(space, context={"request": request}).data)


class MySpacesView(generics.ListAPIView):
    """Пространства, в которых состоит пользователь"""

    permission_classes = [IsAuthenticated]
    serializer_class = SpaceSerializer

    def get_queryset(self):
        user = self.request.user
        return Space.objects.filter(Q(owner=user) | Q(members__user=user)).distinct().order_by("name")
