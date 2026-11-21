from django.contrib import admin

from .models import Moment, Photo, SiteConfig


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 0
    fields = ["image", "thumb"]
    readonly_fields = ["image", "thumb"]
    can_delete = True


@admin.register(Moment)
class MomentAdmin(admin.ModelAdmin):
    list_display = ["date", "title", "location", "is_public", "created_by"]
    list_filter = ["is_public"]
    search_fields = ["title", "description", "location"]
    inlines = [PhotoInline]


@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
