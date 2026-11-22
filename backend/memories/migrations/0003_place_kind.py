from django.db import migrations, models

# (slug, kind, name, English name, icon background) in home-page order.
PLACES = [
    ("seattle", "home", "西雅圖", "Seattle", "#dcece2"),
    ("guangzhou", "home", "廣州", "Guangzhou", "#fbe5ea"),
    ("vancouver", "home", "溫哥華", "Vancouver", "#dfe9f1"),
    ("tokyo", "home", "東京", "Tokyo", "#fbdfdb"),
    ("hongkong", "trip", "香港", "Hong Kong", "#fdeadb"),
    ("chengdu", "trip", "成都", "Chengdu", "#e5efda"),
    ("chongqing", "trip", "重慶", "Chongqing", "#fbebd2"),
    ("macau", "trip", "澳門", "Macau", "#e9e2f1"),
]


def sort_into_kinds(apps, schema_editor):
    """Give the seeded places their kind and order, and add Macau."""
    Place = apps.get_model("memories", "Place")
    for order, (slug, kind, name, name_en, color) in enumerate(PLACES, start=1):
        place, created = Place.objects.get_or_create(
            slug=slug, defaults={"name": name, "name_en": name_en, "color": color, "kind": kind, "order": order}
        )
        if not created:
            place.kind = kind
            place.order = order
            place.save(update_fields=["kind", "order"])


class Migration(migrations.Migration):
    dependencies = [("memories", "0002_places")]

    operations = [
        migrations.AddField(
            model_name="place",
            name="kind",
            field=models.CharField(
                choices=[("home", "居住地"), ("trip", "旅遊地點")], default="trip", max_length=8, verbose_name="類別"
            ),
        ),
        migrations.RunPython(sort_into_kinds, migrations.RunPython.noop),
    ]
