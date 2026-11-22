from django.contrib import admin
from django.urls import path

from memories import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/session/", views.SessionView.as_view()),
    path("api/login/", views.LoginView.as_view()),
    path("api/logout/", views.LogoutView.as_view()),
    path("api/config/", views.SiteConfigView.as_view()),
    path("api/places/", views.PlaceListView.as_view()),
    path("api/places/<slug:slug>/photos/", views.PlacePhotosView.as_view()),
    path("api/photos/<int:pk>/", views.PhotoDetailView.as_view()),
    path("media/<path:path>", views.media),
]
