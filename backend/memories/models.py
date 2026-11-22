import uuid
from datetime import datetime, timedelta
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from PIL import ExifTags, Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()  # iPhone HEIC uploads

DISPLAY_MAX = 2560  # long edge of the full-size version, px
THUMB_MAX = 720  # long edge of the timeline thumbnail, px
NOTE_MAX = 500  # characters in the note written next to a photo


class SiteConfig(models.Model):
    """Single row holding the couple's names and the day it all started."""

    title = models.CharField("網站標題", max_length=60, default="memories")
    name_a = models.CharField("名字 A", max_length=30, blank=True)
    name_b = models.CharField("名字 B", max_length=30, blank=True)
    start_date = models.DateField("在一起的日期", null=True, blank=True)

    class Meta:
        verbose_name = verbose_name_plural = "網站設定"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]


class Place(models.Model):
    """A city on the home page. The frontend draws its landmark icon from `slug`."""

    slug = models.SlugField("代號", unique=True, help_text="網址和圖示用的英文代號，例如 tokyo")
    name = models.CharField("名稱", max_length=40)
    name_en = models.CharField("英文名稱", max_length=40, blank=True)
    color = models.CharField("圖示底色", max_length=7, default="#f6e0d6")
    order = models.PositiveSmallIntegerField("排序", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = verbose_name_plural = "地點"

    def __str__(self):
        return self.name


def _upload_path(instance, filename):
    return f"photos/{instance.place.slug}/{filename}"


class Photo(models.Model):
    place = models.ForeignKey(Place, on_delete=models.PROTECT, related_name="photos", verbose_name="地點")
    image = models.ImageField(upload_to=_upload_path)
    thumb = models.ImageField(upload_to=_upload_path)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    taken_on = models.DateField("拍攝日期")
    note = models.TextField("留言", blank=True, max_length=NOTE_MAX)
    note_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    is_public = models.BooleanField("公開", default=True, help_text="取消勾選後只有登入的人看得到")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["taken_on", "id"]  # the timeline runs oldest to newest
        verbose_name = verbose_name_plural = "照片"

    def __str__(self):
        return f"{self.place} {self.taken_on}"

    @classmethod
    def from_upload(cls, place, upload, *, fallback_date, note="", is_public=True, user=None):
        """Normalise an uploaded file into a web-friendly JPEG plus a thumbnail.

        The date comes from the photo's own EXIF data when it has any; `fallback_date`
        is used for screenshots and other files without it.
        Raises ValueError if the file is not an image Pillow can read.
        """
        try:
            source = Image.open(upload)
            source.load()
        except Exception as exc:  # Pillow raises many different types here
            raise ValueError("not an image") from exc

        taken_on = _exif_date(source) or fallback_date
        source = ImageOps.exif_transpose(source)  # respect phone rotation
        if source.mode != "RGB":
            source = source.convert("RGB")

        stem = uuid.uuid4().hex
        display, (width, height) = _jpeg(source, DISPLAY_MAX, 90)
        thumb, _ = _jpeg(source, THUMB_MAX, 82)
        photo = cls(
            place=place,
            width=width,
            height=height,
            taken_on=taken_on,
            note=note,
            note_by=user if note else None,
            is_public=is_public,
            uploaded_by=user,
        )
        photo.image.save(f"{stem}.jpg", display, save=False)
        photo.thumb.save(f"{stem}_t.jpg", thumb, save=False)
        photo.save()
        return photo


def _exif_date(image):
    """The day the photo was taken according to the camera, or None."""
    try:
        exif = image.getexif()
        raw = exif.get_ifd(ExifTags.IFD.Exif).get(ExifTags.Base.DateTimeOriginal) or exif.get(ExifTags.Base.DateTime)
        taken = datetime.strptime(str(raw)[:10], "%Y:%m:%d").date()
    except Exception:  # missing or malformed EXIF is normal
        return None
    # A camera with an unset clock can claim a date that has not happened yet.
    if taken > timezone.localdate() + timedelta(days=1):
        return None
    return taken


def _jpeg(image, max_edge, quality):
    """Return (file, (width, height)) for a copy no larger than max_edge."""
    copy = image.copy()
    copy.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue()), copy.size


@receiver(post_delete, sender=Photo)
def _remove_photo_files(sender, instance, **kwargs):
    for field in (instance.image, instance.thumb):
        if field:
            field.delete(save=False)
