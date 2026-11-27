from django.urls import path

from . import anniversary, meetings, photos, places, restaurants, session, site

urlpatterns = [
    path("meetings/", meetings.MeetingsView.as_view()),
    path("anniversary/", anniversary.AnniversaryView.as_view()),
    path("session/", session.SessionView.as_view()),
    path("login/", session.LoginView.as_view()),
    path("logout/", session.LogoutView.as_view()),
    path("config/", site.SiteConfigView.as_view()),
    path("places/", places.PlaceListView.as_view()),
    path("places/<slug:slug>/photos/", photos.PlacePhotosView.as_view()),
    path("places/<slug:slug>/restaurants/", restaurants.PlaceRestaurantsView.as_view()),
    path("photos/<int:pk>/", photos.PhotoDetailView.as_view()),
    path("restaurants/<int:pk>/", restaurants.RestaurantDetailView.as_view()),
]
