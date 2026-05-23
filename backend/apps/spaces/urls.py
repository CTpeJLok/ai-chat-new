from django.urls import path

from .views import MySpacesView, SpaceJoinView, SpaceListCreateView

urlpatterns = [
    path("", SpaceListCreateView.as_view()),
    path("my/", MySpacesView.as_view()),
    path("<int:pk>/join/", SpaceJoinView.as_view()),
]
