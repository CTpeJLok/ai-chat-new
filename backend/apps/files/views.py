from django.http import FileResponse
from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import File
from .permissions import IsSpaceMember
from .serializers import FileSerializer


class FileListUploadView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsSpaceMember]
    serializer_class = FileSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return File.objects.filter(space_id=self.kwargs["space_id"]).order_by("-created_at")

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        serializer.save(
            space_id=self.kwargs['space_id'],
            uploaded_by=self.request.user,
            name=file_obj.name if file_obj else 'unnamed',
        )


class FileDetailView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FileSerializer
    queryset = File.objects.all()


class FileDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            f = File.objects.get(pk=pk)
        except File.DoesNotExist:
            return Response(status=404)
        return FileResponse(f.file.open("rb"), as_attachment=True, filename=f.name)
