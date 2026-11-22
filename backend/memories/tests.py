import shutil
import tempfile
from datetime import date
from io import BytesIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import ExifTags, Image
from rest_framework.test import APIClient

from .models import Photo, Place, Restaurant


def _jpeg_upload(size=(3000, 2000), name="a.jpg", taken=None):
    """A JPEG upload; `taken` ("YYYY:MM:DD HH:MM:SS") is written as the EXIF capture time."""
    buffer = BytesIO()
    image = Image.new("RGB", size, (200, 120, 130))
    exif = Image.Exif()
    if taken:
        exif.get_ifd(ExifTags.IFD.Exif)[ExifTags.Base.DateTimeOriginal] = taken
    image.save(buffer, "JPEG", exif=exif)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


MEDIA_ROOT = tempfile.mkdtemp()  # uploads made by the tests; removed when they finish


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class ApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        cache.clear()  # the login throttle counts attempts in the cache
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
                ("now", "vancouver"),
                ("now", "tokyo"),
                ("past", "seattle"),
                ("past", "guangzhou"),
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

    def test_adding_restaurants_and_counting_them(self):
        body = {"name": " 巷口拉麵 ", "cuisine": "拉麵", "location": "車站旁", "must_order": "叉燒拉麵"}
        plain = self.member.post("/api/places/tokyo/restaurants/", body, format="multipart")
        self.assertEqual(plain.status_code, 201)
        self.assertEqual(plain.json()["name"], "巷口拉麵")
        self.assertEqual((plain.json()["image"], plain.json()["note"]), (None, ""))

        with_cover = {"name": "海邊小館", "image": _jpeg_upload(size=(2400, 1800)), "note": "看著海吃飯"}
        data = self.member.post("/api/places/tokyo/restaurants/", with_cover, format="multipart").json()
        self.assertTrue(data["image"].startswith("/media/restaurants/tokyo/"))
        self.assertEqual((data["cuisine"], data["note_by"]), ("", "tester"))
        self.assertEqual(Image.open(Restaurant.objects.get(id=data["id"]).image.path).size, (1600, 1200))

        # Visitors can read the list and the covers, and the counts are not multiplied by the photos.
        self._photo(date(2026, 1, 1))
        self._photo(date(2026, 1, 2))
        self._photo(date(2026, 1, 3))
        names = [r["name"] for r in self.anon.get("/api/places/tokyo/restaurants/").json()]
        self.assertEqual(names, ["巷口拉麵", "海邊小館"])
        self.assertEqual(self.anon.get(data["thumb"]).status_code, 200)
        tokyo = next(p for p in self.anon.get("/api/places/").json() if p["slug"] == "tokyo")
        self.assertEqual((tokyo["photo_count"], tokyo["restaurant_count"]), (3, 2))

    def test_restaurant_needs_a_name_and_a_real_picture(self):
        self.assertEqual(self.member.post("/api/places/tokyo/restaurants/", {"cuisine": "拉麵"}).status_code, 400)
        fake = SimpleUploadedFile("a.jpg", b"not really a photo", content_type="image/jpeg")
        bad = self.member.post("/api/places/tokyo/restaurants/", {"name": "x", "image": fake}, format="multipart")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(Restaurant.objects.count(), 0)
        self.assertEqual(self.member.post("/api/places/atlantis/restaurants/", {"name": "x"}).status_code, 404)

    def test_visitors_cannot_change_restaurants(self):
        restaurant = Restaurant.objects.create(place=self.tokyo, name="巷口拉麵")
        self.assertEqual(self.anon.post("/api/places/tokyo/restaurants/", {"name": "x"}).status_code, 403)
        self.assertEqual(self.anon.patch(f"/api/restaurants/{restaurant.id}/", {"name": "hacked"}).status_code, 403)
        self.assertEqual(self.anon.delete(f"/api/restaurants/{restaurant.id}/").status_code, 403)
        self.assertEqual(Restaurant.objects.get().name, "巷口拉麵")

    def test_editing_and_deleting_a_restaurant(self):
        created = {"name": "巷口拉麵", "image": _jpeg_upload(size=(400, 300))}
        first = self.member.post("/api/places/tokyo/restaurants/", created, format="multipart").json()
        url = f"/api/restaurants/{first['id']}/"
        old_cover = Path(Restaurant.objects.get().image.path)

        data = self.member.patch(url, {"note": "湯頭很濃", "must_order": "加麵"}, format="json").json()
        self.assertEqual((data["note"], data["note_by"], data["must_order"]), ("湯頭很濃", "tester", "加麵"))
        self.assertEqual(data["image"], first["image"])  # untouched when no new picture is sent

        # A new picture replaces the old files.
        data = self.member.patch(url, {"image": _jpeg_upload(size=(300, 300))}, format="multipart").json()
        self.assertNotEqual(data["image"], first["image"])
        self.assertFalse(old_cover.exists())

        new_cover = Path(Restaurant.objects.get().image.path)
        self.assertEqual(self.member.delete(url).status_code, 204)
        self.assertFalse(new_cover.exists())

    def test_login_logout_flow_with_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertFalse(client.get("/api/session/").json()["authenticated"])
        token = client.cookies["csrftoken"].value
        creds = {"username": "tester", "password": "a-long-test-passphrase"}

        self.assertEqual(client.post("/api/login/", creds, format="json").status_code, 403)  # no CSRF token
        bad = client.post("/api/login/", {**creds, "password": "wrong"}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(bad.status_code, 400)
        not_an_object = client.post("/api/login/", ["tester"], format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(not_an_object.status_code, 400)
        good = client.post("/api/login/", creds, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(good.json(), {"authenticated": True, "username": "tester"})

        token = client.cookies["csrftoken"].value  # rotated on login
        self.assertEqual(client.post("/api/logout/", HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertFalse(client.get("/api/session/").json()["authenticated"])

    def test_admin_login_attempts_are_limited(self):
        guess = {"username": "tester", "password": "wrong"}
        for _ in range(10):
            self.assertEqual(self.anon.post("/admin/login/", guess).status_code, 200)  # the form again, with an error
        blocked = self.anon.post("/admin/login/", guess)
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked)
        # Even the right password has to wait, and the API's login shares the same allowance.
        right = {"username": "tester", "password": "a-long-test-passphrase"}
        self.assertEqual(self.anon.post("/admin/login/", right).status_code, 429)
        self.assertEqual(self.anon.post("/api/login/", right, format="json").status_code, 429)
        # Only password attempts are limited: the page itself and the rest of the site still load.
        self.assertEqual(self.anon.get("/admin/login/").status_code, 200)
        self.assertEqual(self.anon.get("/api/places/").status_code, 200)

    def test_admin_login_still_works_within_the_limit(self):
        get_user_model().objects.create_superuser("boss", password="yet-another-long-passphrase")
        client = APIClient()
        response = client.post("/admin/login/", {"username": "boss", "password": "yet-another-long-passphrase"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(client.get("/admin/").status_code, 200)
