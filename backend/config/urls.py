from django.contrib import admin
from django.urls import include, path

from memories.media import media

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("memories.api.urls")),
    path("media/<path:path>", media),
]
