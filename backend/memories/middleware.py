from django.conf import settings
from django.http import HttpResponse
from django.urls import reverse
from rest_framework.throttling import SimpleRateThrottle


class LoginAttempts(SimpleRateThrottle):
    """Password attempts per visitor address, at the "login" rate in settings.

    The cache key is the one the API's own login uses (ScopedRateThrottle with the same scope),
    so the two login forms share one allowance instead of doubling it.
    """

    scope = "login"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def admin_login_throttle(get_response):
    """Limit password attempts at the admin's login page, which the API's throttle does not cover."""

    def middleware(request):
        if request.method == "POST" and request.path == reverse("admin:login"):
            attempts = LoginAttempts()
            if not attempts.allow_request(request, None):
                response = HttpResponse(
                    "嘗試太多次了，請一分鐘後再試。", status=429, content_type="text/plain; charset=utf-8"
                )
                response["Retry-After"] = str(int(attempts.wait() or 60) + 1)
                return response
        return get_response(request)

    return middleware


def member_content(get_response):
    """Serve the entry document for this worker's asset index and protect member content."""
    # WhiteNoise indexes asset filenames at startup. Pin the HTML to the same
    # build so rebuilding dist cannot advertise chunks the worker cannot serve.
    entry = settings.FRONTEND_DIST / "index.html"
    index_html = entry.read_bytes() if entry.is_file() else None

    def middleware(request):
        if index_html is not None and request.path in ("/", "/index.html") and request.method in ("GET", "HEAD"):
            response = HttpResponse(index_html, content_type="text/html; charset=utf-8")
        elif request.path.startswith("/members/") and not request.user.is_authenticated:
            response = HttpResponse(status=404)
        else:
            response = get_response(request)
        if (request.path in ("/", "/index.html")
                or request.path.startswith(("/members/", "/api/", "/media/"))
                or (request.path.startswith("/assets/") and response.status_code >= 400)):
            response["Cache-Control"] = "private, no-store"
        return response

    return middleware
