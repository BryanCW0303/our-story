import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()  # iPhone HEIC uploads

DISPLAY_MAX = 2560  # long edge of the full-size version, px
THUMB_MAX = 720  # long edge of the timeline thumbnail, px


class SiteConfig(models.Model):
    """Single row holding the couple's names and the day it all started."""

    title = models.CharField("網站標題", max_length=60, default="我們的故事")
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


class Moment(models.Model):
    title = models.CharField("標題", max_length=120)
    date = models.DateField("日期")
    location = models.CharField("地點", max_length=120, blank=True)
    description = models.TextField("內容", blank=True)
    is_public = models.BooleanField("公開", default=True, help_text="取消勾選後只有登入的人看得到")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="moments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = verbose_name_plural = "回憶"

    def __str__(self):
        return f"{self.date} {self.title}"


def _upload_path(instance, filename):
    return f"photos/{instance.moment_id}/{filename}"


class Photo(models.Model):
    moment = models.ForeignKey(Moment, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to=_upload_path)
    thumb = models.ImageField(upload_to=_upload_path)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = verbose_name_plural = "照片"

    def __str__(self):
        return self.image.name

    @classmethod
    def from_upload(cls, moment, upload):
        """Normalise an uploaded file into a web-friendly JPEG plus a thumbnail.

        Raises ValueError if the file is not an image Pillow can read.
        """
        try:
            source = Image.open(upload)
            source.load()
        except Exception as exc:  # Pillow raises many different types here
            raise ValueError("not an image") from exc

        source = ImageOps.exif_transpose(source)  # respect phone rotation
        if source.mode != "RGB":
            source = source.convert("RGB")

        stem = uuid.uuid4().hex
        display, (width, height) = _jpeg(source, DISPLAY_MAX, 90)
        thumb, _ = _jpeg(source, THUMB_MAX, 82)
        photo = cls(moment=moment, width=width, height=height)
        photo.image.save(f"{stem}.jpg", display, save=False)
        photo.thumb.save(f"{stem}_t.jpg", thumb, save=False)
        photo.save()
        return photo


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
