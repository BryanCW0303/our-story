import tempfile
from datetime import date
from io import BytesIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import ExifTags, Image
from rest_framework.test import APIClient

from .models import Photo, Place


def _jpeg_upload(size=(3000, 2000), name="a.jpg", taken=None):
    """A JPEG upload; `taken` ("YYYY:MM:DD HH:MM:SS") is written as the EXIF capture time."""
    buffer = BytesIO()
    image = Image.new("RGB", size, (200, 120, 130))
    exif = Image.Exif()
    if taken:
        exif.get_ifd(ExifTags.IFD.Exif)[ExifTags.Base.DateTimeOriginal] = taken
    image.save(buffer, "JPEG", exif=exif)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("tester", password="a-long-test-passphrase")
        self.tokyo = Place.objects.get(slug="tokyo")
        self.anon = APIClient()
        self.member = APIClient()
        self.member.force_authenticate(self.user)

    def _photo(self, taken_on, **extra):
        return Photo.from_upload(self.tokyo, _jpeg_upload(size=(400, 300)), fallback_date=taken_on, **extra)

    def test_places_are_seeded_by_kind_in_order(self):
        places = self.anon.get("/api/places/").json()
        self.assertEqual(
            [(p["kind"], p["slug"]) for p in places],
            [
                ("home", "seattle"),
                ("home", "guangzhou"),
                ("home", "vancouver"),
                ("home", "tokyo"),
                ("trip", "hongkong"),
                ("trip", "chengdu"),
                ("trip", "chongqing"),
                ("trip", "macau"),
                ("trip", "vancouver-trip"),
                ("trip", "kyoto"),
            ],
        )
        self.assertEqual({p["photo_count"] for p in places}, {0})
        self.assertEqual({p["first_photo"] for p in places}, {None})

    def test_place_dates_span_its_visible_photos(self):
        self._photo(date(2026, 3, 28))
        self._photo(date(2026, 4, 1))
        self._photo(date(2025, 12, 1), is_public=False)

        def tokyo(client):
            place = next(p for p in client.get("/api/places/").json() if p["slug"] == "tokyo")
            return place["first_photo"], place["last_photo"]

        self.assertEqual(tokyo(self.member), ("2025-12-01", "2026-04-01"))
        self.assertEqual(tokyo(self.anon), ("2026-03-28", "2026-04-01"))  # the private one stays hidden

    def test_photos_are_listed_oldest_first(self):
        self._photo(date(2026, 3, 29))
        self._photo(date(2025, 12, 1))
        self._photo(date(2026, 3, 28))
        days = [p["taken_on"] for p in self.anon.get("/api/places/tokyo/photos/").json()]
        self.assertEqual(days, ["2025-12-01", "2026-03-28", "2026-03-29"])
        self.assertEqual(self.anon.get("/api/places/atlantis/photos/").status_code, 404)

    def test_visitors_only_see_and_count_public_photos(self):
        self._photo(date(2026, 1, 1))
        hidden = self._photo(date(2026, 1, 2), is_public=False)

        def tokyo_count(client):
            return next(p["photo_count"] for p in client.get("/api/places/").json() if p["slug"] == "tokyo")

        self.assertEqual(tokyo_count(self.anon), 1)
        self.assertEqual(tokyo_count(self.member), 2)
        self.assertEqual(len(self.anon.get("/api/places/tokyo/photos/").json()), 1)
        self.assertEqual(len(self.member.get("/api/places/tokyo/photos/").json()), 2)
        self.assertEqual(self.anon.get(f"/api/photos/{hidden.id}/").status_code, 404)

    def test_visitors_cannot_write(self):
        photo = self._photo(date(2026, 1, 1))
        upload = {"image": _jpeg_upload(size=(40, 30))}
        self.assertEqual(self.anon.post("/api/places/tokyo/photos/", upload, format="multipart").status_code, 403)
        self.assertEqual(self.anon.patch(f"/api/photos/{photo.id}/", {"note": "hacked"}).status_code, 403)
        self.assertEqual(self.anon.delete(f"/api/photos/{photo.id}/").status_code, 403)
        self.assertEqual(self.anon.put("/api/config/", {"title": "hacked"}).status_code, 403)
        self.assertEqual(Photo.objects.get().note, "")

    def test_upload_is_resized_and_dated_from_exif(self):
        body = {"image": _jpeg_upload(taken="2026:03:28 10:15:00"), "taken_on": "2026-11-04", "note": " 櫻花 "}
        response = self.member.post("/api/places/tokyo/photos/", body, format="multipart")
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual((data["width"], data["height"]), (2560, 1707))
        self.assertEqual(data["taken_on"], "2026-03-28")  # the camera's date wins over the form's
        self.assertEqual((data["note"], data["note_by"]), ("櫻花", "tester"))
        self.assertTrue(data["image"].startswith("/media/photos/tokyo/"))

    def test_upload_without_exif_uses_the_date_from_the_form(self):
        body = {"image": _jpeg_upload(size=(40, 30)), "taken_on": "2026-11-04"}
        data = self.member.post("/api/places/tokyo/photos/", body, format="multipart").json()
        self.assertEqual(data["taken_on"], "2026-11-04")
        self.assertEqual((data["note"], data["note_by"]), ("", ""))

    def test_private_photo_files_are_hidden_from_visitors(self):
        body = {"image": _jpeg_upload(size=(40, 30)), "is_public": "false"}
        data = self.member.post("/api/places/tokyo/photos/", body, format="multipart").json()
        self.assertFalse(data["is_public"])
        self.assertEqual(self.anon.get(data["image"]).status_code, 404)
        self.assertEqual(self.anon.get(data["thumb"]).status_code, 404)
        session_client = APIClient()
        session_client.force_login(self.user)
        self.assertEqual(session_client.get(data["thumb"]).status_code, 200)

        # Once it is made public, anyone can load it.
        self.assertEqual(self.member.patch(f"/api/photos/{data['id']}/", {"is_public": True}).status_code, 200)
        self.assertEqual(self.anon.get(data["image"]).status_code, 200)

    def test_non_image_upload_is_rejected(self):
        fake = SimpleUploadedFile("a.jpg", b"not really a photo", content_type="image/jpeg")
        response = self.member.post("/api/places/tokyo/photos/", {"image": fake}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Photo.objects.count(), 0)

    def test_editing_a_note_signs_it_and_can_move_the_date(self):
        photo = self._photo(date(2026, 1, 1))
        other = get_user_model().objects.create_user("Emily", password="another-long-passphrase")
        emily = APIClient()
        emily.force_authenticate(other)

        data = emily.patch(f"/api/photos/{photo.id}/", {"note": "花瓣掉在你頭髮上"}).json()
        self.assertEqual((data["note"], data["note_by"]), ("花瓣掉在你頭髮上", "Emily"))

        # Changing only the date keeps the signature of whoever wrote the note.
        data = self.member.patch(f"/api/photos/{photo.id}/", {"taken_on": "2026-02-14"}).json()
        self.assertEqual((data["taken_on"], data["note_by"]), ("2026-02-14", "Emily"))

        data = self.member.patch(f"/api/photos/{photo.id}/", {"note": ""}).json()
        self.assertEqual((data["note"], data["note_by"]), ("", ""))
        self.assertEqual(self.member.patch(f"/api/photos/{photo.id}/", {"note": "x" * 501}).status_code, 400)

    def test_deleting_photo_removes_files(self):
        photo = self._photo(date(2026, 1, 1))
        paths = [Path(photo.image.path), Path(photo.thumb.path)]
        self.assertTrue(all(p.exists() for p in paths))
        self.assertEqual(self.member.delete(f"/api/photos/{photo.id}/").status_code, 204)
        self.assertFalse(any(p.exists() for p in paths))

    def test_login_logout_flow_with_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertFalse(client.get("/api/session/").json()["authenticated"])
        token = client.cookies["csrftoken"].value
        creds = {"username": "tester", "password": "a-long-test-passphrase"}

        self.assertEqual(client.post("/api/login/", creds, format="json").status_code, 403)  # no CSRF token
        bad = client.post("/api/login/", {**creds, "password": "wrong"}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(bad.status_code, 400)
        good = client.post("/api/login/", creds, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(good.json(), {"authenticated": True, "username": "tester"})

        token = client.cookies["csrftoken"].value  # rotated on login
        self.assertEqual(client.post("/api/logout/", HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertFalse(client.get("/api/session/").json()["authenticated"])
