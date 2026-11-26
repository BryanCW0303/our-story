import uuid

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .photo_images import prepare_photo

NOTE_MAX = 500  # characters in the note written next to a photo


class SiteConfig(models.Model):
    """Single row holding the couple's names and the day it all started."""

    reunion_date = models.DateField("見面日期", null=True, blank=True)
    reunion_city = models.CharField("見面地點", max_length=60, blank=True)
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
        display, thumb, (width, height), taken_on = prepare_photo(upload, fallback_date)
        stem = uuid.uuid4().hex
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
    name = models.CharField("餐飲名稱", max_length=60)
    cuisine = models.CharField("種類", max_length=30, blank=True)
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
        verbose_name = verbose_name_plural = "餐飲"

    def __str__(self):
        return f"{self.place} {self.name}"

    def remove_cover(self):
        for field in (self.image, self.thumb):
            if field:
                field.delete(save=False)


@receiver(post_delete, sender=Photo)
@receiver(post_delete, sender=Restaurant)
def _remove_files(sender, instance, **kwargs):
    for field in (instance.image, instance.thumb):
        if field:
            field.delete(save=False)

class AnniversaryDisplay(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    local_day = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "local_day"], name="one_anniversary_per_member_day")
        ]
