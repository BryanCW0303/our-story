import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import memories.models

PLACES = [
    ("seattle", "西雅圖", "Seattle", "#dcece2"),
    ("vancouver", "溫哥華", "Vancouver", "#dfe9f1"),
    ("guangzhou", "廣州", "Guangzhou", "#fbe5ea"),
    ("hongkong", "香港", "Hong Kong", "#fdeadb"),
    ("chengdu", "成都", "Chengdu", "#e5efda"),
    ("chongqing", "重慶", "Chongqing", "#fbebd2"),
    ("tokyo", "東京", "Tokyo", "#fbdfdb"),
]


def add_places(apps, schema_editor):
    Place = apps.get_model("memories", "Place")
    for order, (slug, name, name_en, color) in enumerate(PLACES, start=1):
        Place.objects.get_or_create(slug=slug, defaults={"name": name, "name_en": name_en, "color": color, "order": order})


class Migration(migrations.Migration):
    """Photos now hang directly off a place instead of a titled "moment".

    The old Moment and Photo tables are dropped rather than converted: this was
    written before any had been created.
    """

    dependencies = [
        ("memories", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(name="Photo"),
        migrations.DeleteModel(name="Moment"),
        migrations.AlterField(
            model_name="siteconfig",
            name="title",
            field=models.CharField(default="memories", max_length=60, verbose_name="網站標題"),
        ),
        migrations.CreateModel(
            name="Place",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(help_text="網址和圖示用的英文代號，例如 tokyo", unique=True, verbose_name="代號")),
                ("name", models.CharField(max_length=40, verbose_name="名稱")),
                ("name_en", models.CharField(blank=True, max_length=40, verbose_name="英文名稱")),
                ("color", models.CharField(default="#f6e0d6", max_length=7, verbose_name="圖示底色")),
                ("order", models.PositiveSmallIntegerField(default=0, verbose_name="排序")),
            ],
            options={"verbose_name": "地點", "verbose_name_plural": "地點", "ordering": ["order", "id"]},
        ),
        migrations.CreateModel(
            name="Photo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to=memories.models._upload_path)),
                ("thumb", models.ImageField(upload_to=memories.models._upload_path)),
                ("width", models.PositiveIntegerField(default=0)),
                ("height", models.PositiveIntegerField(default=0)),
                ("taken_on", models.DateField(verbose_name="拍攝日期")),
                ("note", models.TextField(blank=True, max_length=500, verbose_name="留言")),
                ("is_public", models.BooleanField(default=True, help_text="取消勾選後只有登入的人看得到", verbose_name="公開")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "note_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "place",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="photos",
                        to="memories.place",
                        verbose_name="地點",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"verbose_name": "照片", "verbose_name_plural": "照片", "ordering": ["taken_on", "id"]},
        ),
        migrations.RunPython(add_places, migrations.RunPython.noop),
    ]
