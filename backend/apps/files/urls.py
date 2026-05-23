from django.urls import path

from .views import FileDetailView, FileDownloadView, FileListUploadView

urlpatterns = [
    path("spaces/<int:space_id>/files/", FileListUploadView.as_view()),
    path("files/<int:pk>/", FileDetailView.as_view()),
    path("files/<int:pk>/download/", FileDownloadView.as_view()),
]
