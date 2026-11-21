import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .models import Moment, Photo


def _jpeg_upload(size=(3000, 2000), name="a.jpg"):
    buffer = BytesIO()
    Image.new("RGB", size, (200, 120, 130)).save(buffer, "JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("tester", password="a-long-test-passphrase")
        self.public = Moment.objects.create(title="公開", date="2024-02-14", is_public=True)
        self.private = Moment.objects.create(title="私密", date="2024-03-01", is_public=False)
        self.anon = APIClient()
        self.member = APIClient()
        self.member.force_authenticate(self.user)

    def test_visitors_only_see_public_moments(self):
        titles = [m["title"] for m in self.anon.get("/api/moments/").json()["results"]]
        self.assertEqual(titles, ["公開"])
        self.assertEqual(self.anon.get(f"/api/moments/{self.private.id}/").status_code, 404)

    def test_members_see_everything_newest_first(self):
        titles = [m["title"] for m in self.member.get("/api/moments/").json()["results"]]
        self.assertEqual(titles, ["私密", "公開"])

    def test_visitors_cannot_write(self):
        body = {"title": "x", "date": "2024-01-01"}
        self.assertEqual(self.anon.post("/api/moments/", body).status_code, 403)
        self.assertEqual(self.anon.delete(f"/api/moments/{self.public.id}/").status_code, 403)
        self.assertEqual(self.anon.put("/api/config/", {"title": "hacked"}).status_code, 403)
        self.assertEqual(
            self.anon.post(f"/api/moments/{self.public.id}/photos/", {"image": _jpeg_upload()}).status_code, 403
        )

    def test_create_moment_records_author(self):
        response = self.member.post("/api/moments/", {"title": "第一次約會", "date": "2023-05-20"})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["author"], "tester")

    def test_photo_upload_is_resized_and_private_photos_are_hidden(self):
        response = self.member.post(
            f"/api/moments/{self.private.id}/photos/", {"image": _jpeg_upload()}, format="multipart"
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual((data["width"], data["height"]), (2560, 1707))

        # Private moment: visitors get 404 for both sizes, members get the file.
        self.assertEqual(self.anon.get(data["image"]).status_code, 404)
        self.assertEqual(self.anon.get(data["thumb"]).status_code, 404)
        session_client = APIClient()
        session_client.force_login(self.user)
        self.assertEqual(session_client.get(data["thumb"]).status_code, 200)

        # Once the moment is public, anyone can load it.
        self.private.is_public = True
        self.private.save()
        self.assertEqual(self.anon.get(data["image"]).status_code, 200)

    def test_non_image_upload_is_rejected(self):
        fake = SimpleUploadedFile("a.jpg", b"not really a photo", content_type="image/jpeg")
        response = self.member.post(f"/api/moments/{self.public.id}/photos/", {"image": fake}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Photo.objects.count(), 0)

    def test_deleting_photo_removes_files(self):
        photo = Photo.from_upload(self.public, _jpeg_upload(size=(400, 300)))
        path = photo.image.path
        self.assertEqual(self.member.delete(f"/api/photos/{photo.id}/").status_code, 204)
        from pathlib import Path

        self.assertFalse(Path(path).exists())

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
