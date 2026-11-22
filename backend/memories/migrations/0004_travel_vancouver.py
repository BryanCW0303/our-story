from django.db import migrations


def add_travel_vancouver(apps, schema_editor):
    """Vancouver a second time, as a trip: its own place with its own photos."""
    Place = apps.get_model("memories", "Place")
    Place.objects.get_or_create(
        slug="vancouver-trip",
        defaults={"name": "溫哥華", "name_en": "Vancouver", "color": "#f6efd2", "kind": "trip", "order": 9},
    )


class Migration(migrations.Migration):
    dependencies = [("memories", "0003_place_kind")]

    operations = [migrations.RunPython(add_travel_vancouver, migrations.RunPython.noop)]
