from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView


def _session_payload(request):
    user = request.user
    return {"authenticated": user.is_authenticated, "username": user.get_username() if user.is_authenticated else ""}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Who am I? Also hands the browser its CSRF cookie on first load."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(_session_payload(request))


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        # A body that is valid JSON but not an object (a list, a number) carries no credentials.
        data = request.data if isinstance(request.data, dict) else {}
        user = authenticate(
            request,
            username=str(data.get("username", "")),
            password=str(data.get("password", "")),
        )
        if user is None:
            return Response({"detail": "帳號或密碼不正確"}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response(_session_payload(request))


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(_session_payload(request))
