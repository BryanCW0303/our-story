from django.contrib import admin

from .models import Photo, Place, SiteConfig


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ["name", "name_en", "kind", "slug", "order"]
    list_editable = ["order"]
    list_filter = ["kind"]


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ["taken_on", "place", "note", "is_public", "uploaded_by"]
    list_filter = ["place", "is_public"]
    search_fields = ["note"]
    date_hierarchy = "taken_on"
    # Files are produced by the upload code; the admin only edits the text around them.
    readonly_fields = ["image", "thumb", "width", "height", "uploaded_by", "created_at"]

    def has_add_permission(self, request):
        return False


@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
