from django.db.models import Q
from django.http import FileResponse, Http404

from .models import Photo, Restaurant


def media(request, path):
    """Serve uploaded photos and restaurant covers to signed-in members."""
    if not request.user.is_authenticated:
        raise Http404
    photo = Photo.objects.filter(Q(image=path) | Q(thumb=path)).first()
    if photo is None:
        photo = Restaurant.objects.filter(Q(image=path) | Q(thumb=path)).first()
        if photo is None:
            raise Http404
    field = photo.image if photo.image.name == path else photo.thumb
    try:
        response = FileResponse(field.open("rb"), content_type="image/jpeg")
    except FileNotFoundError as exc:
        raise Http404 from exc
    return response
