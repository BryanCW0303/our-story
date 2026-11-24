import uuid
from datetime import datetime, timedelta
from io import BytesIO

from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException
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
    """A city on the home page. The frontend draws its landmark icon from `slug`.

    The same city can appear once per kind (Vancouver as a home and as a trip): two
    places with the same name, each with its own photos.
    """

    class Kind(models.TextChoices):
        NOW = "now", "現居地"
        PAST = "past", "曾經居住過的地方"
        TRIP = "trip", "旅遊地點"

    slug = models.SlugField("代號", unique=True, help_text="網址和圖示用的英文代號，例如 tokyo")
    name = models.CharField("名稱", max_length=40)
    name_en = models.CharField("英文名稱", max_length=40, blank=True)
    kind = models.CharField("類別", max_length=8, choices=Kind.choices, default=Kind.TRIP)
    color = models.CharField("圖示底色", max_length=7, default="#f6e0d6")
    order = models.PositiveSmallIntegerField("排序", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = verbose_name_plural = "地點"

    def __str__(self):
        return self.name


def _upload_path(instance, filename):
    return f"photos/{instance.place.slug}/{filename}"


def _restaurant_path(instance, filename):
    return f"restaurants/{instance.place.slug}/{filename}"


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
    def from_upload(cls, place, upload, *, fallback_date, note="", user=None):
        """Normalise an uploaded file into a web-friendly JPEG plus a thumbnail.

        The date comes from the photo's own EXIF data when it has any; `fallback_date`
        is used for screenshots and other files without it.
        Raises ValueError if the file is not an image Pillow can read.
        """
        source = _read_image(upload)
        taken_on = _exif_date(source) or fallback_date
        source = _upright_rgb(source)

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
            uploaded_by=user,
        )
        photo.image.save(f"{stem}.jpg", display, save=False)
        photo.thumb.save(f"{stem}_t.jpg", thumb, save=False)
        photo.save()
        return photo


class Restaurant(models.Model):
    """A favourite restaurant in a place. Legacy cover fields are retained for existing data."""

    place = models.ForeignKey(Place, on_delete=models.PROTECT, related_name="restaurants", verbose_name="地點")
    name = models.CharField("餐廳名", max_length=60)
    cuisine = models.CharField("種類", max_length=30, blank=True)
    location = models.CharField("位置", max_length=120, blank=True)
    must_order = models.CharField("必點", max_length=120, blank=True)
    image = models.ImageField(upload_to=_restaurant_path, blank=True)
    thumb = models.ImageField(upload_to=_restaurant_path, blank=True)
    note = models.TextField("留言", blank=True, max_length=NOTE_MAX)
    note_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]  # in the order they were added
        verbose_name = verbose_name_plural = "餐廳"

    def __str__(self):
        return f"{self.place} {self.name}"

    def remove_cover(self):
        for field in (self.image, self.thumb):
            if field:
                field.delete(save=False)


def _read_image(upload):
    try:
        image = Image.open(upload)
        image.load()
    except Exception as exc:  # Pillow raises many different types here
        raise ValueError("not an image") from exc
    return image


def _upright_rgb(image):
    image = ImageOps.exif_transpose(image)  # respect phone rotation
    return image if image.mode == "RGB" else image.convert("RGB")


def _photo_date(raw, latest):
    """Read the camera-local calendar date, including for timestamps with an offset."""
    if isinstance(raw, bytes):
        raw = raw.decode("ascii", errors="replace")
    if not isinstance(raw, str):
        return None
    prefix = raw.strip()[:10]
    for fmt in ("%Y:%m:%d", "%Y-%m-%d"):
        try:
            day = datetime.strptime(prefix, fmt).date()
        except ValueError:
            continue
        if day <= latest:
            return day
    return None


def _xmp_capture_dates(image):
    packet = image.info.get("xmp") or image.info.get("XML:com.adobe.xmp")
    if not packet or len(packet) > 1024 * 1024:
        return
    try:
        root = ElementTree.fromstring(packet, forbid_dtd=True)
    except (ElementTree.ParseError, DefusedXmlException, ValueError, LookupError):
        return
    for tag in ("{http://ns.adobe.com/exif/1.0/}DateTimeOriginal",
                "{http://ns.adobe.com/photoshop/1.0/}DateCreated",
                "{http://ns.adobe.com/xap/1.0/}CreateDate"):
        for node in root.iter():
            if tag in node.attrib:
                yield node.attrib[tag]
            if node.tag == tag:
                yield node.text


def _exif_date(image):
    latest = timezone.localdate() + timedelta(days=1)
    try:
        exif = image.getexif()
    except Exception:  # A damaged EXIF block can coexist with usable XMP.
        exif = {}
    try:
        details = exif.get_ifd(ExifTags.IFD.Exif)
    except Exception:
        details = {}
    tag = ExifTags.Base
    for raw in (details.get(tag.DateTimeOriginal), exif.get(tag.DateTimeOriginal)):
        if day := _photo_date(raw, latest):
            return day
    for raw in _xmp_capture_dates(image):
        if day := _photo_date(raw, latest):
            return day
    for raw in (details.get(tag.DateTimeDigitized), exif.get(tag.DateTimeDigitized), exif.get(tag.DateTime)):
        if day := _photo_date(raw, latest):
            return day
    return None


def _jpeg(image, max_edge, quality):
    """Return (file, (width, height)) for a copy no larger than max_edge."""
    copy = image.copy()
    copy.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue()), copy.size


@receiver(post_delete, sender=Photo)
@receiver(post_delete, sender=Restaurant)
def _remove_files(sender, instance, **kwargs):
    for field in (instance.image, instance.thumb):
        if field:
            field.delete(save=False)
