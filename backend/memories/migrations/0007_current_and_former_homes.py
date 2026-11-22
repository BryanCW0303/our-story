from django.db import migrations, models

# Homes split in two; (slug, kind) in home-page order.
PLACES = [
    ("vancouver", "now"),
    ("tokyo", "now"),
    ("seattle", "past"),
    ("guangzhou", "past"),
    ("hongkong", "trip"),
    ("chengdu", "trip"),
    ("chongqing", "trip"),
    ("macau", "trip"),
    ("vancouver-trip", "trip"),
    ("kyoto", "trip"),
]


def split_homes(apps, schema_editor):
    Place = apps.get_model("memories", "Place")
    for order, (slug, kind) in enumerate(PLACES, start=1):
        Place.objects.filter(slug=slug).update(kind=kind, order=order)
    # Anything added by hand as a home becomes a former home rather than keeping a kind that no longer exists.
    Place.objects.filter(kind="home").update(kind="past")


class Migration(migrations.Migration):
    dependencies = [("memories", "0006_restaurant")]

    operations = [
        migrations.AlterField(
            model_name="place",
            name="kind",
            field=models.CharField(
                choices=[("now", "現居地"), ("past", "曾經居住過的地方"), ("trip", "旅遊地點")],
                default="trip",
                max_length=8,
                verbose_name="類別",
            ),
        ),
        migrations.RunPython(split_homes, migrations.RunPython.noop),
    ]
