from django.db import migrations


def add_kyoto(apps, schema_editor):
    Place = apps.get_model("memories", "Place")
    Place.objects.get_or_create(
        slug="kyoto",
        defaults={"name": "京都", "name_en": "Kyoto", "color": "#d8e8e4", "kind": "trip", "order": 10},
    )


class Migration(migrations.Migration):
    dependencies = [("memories", "0004_travel_vancouver")]

    operations = [migrations.RunPython(add_kyoto, migrations.RunPython.noop)]
