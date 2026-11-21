from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from memories import views

router = DefaultRouter()
router.register("moments", views.MomentViewSet, basename="moment")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/session/", views.SessionView.as_view()),
    path("api/login/", views.LoginView.as_view()),
    path("api/logout/", views.LogoutView.as_view()),
    path("api/config/", views.SiteConfigView.as_view()),
    path("api/photos/<int:pk>/", views.PhotoDeleteView.as_view()),
    path("api/", include(router.urls)),
    path("media/<path:path>", views.media),
]
