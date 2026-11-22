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
