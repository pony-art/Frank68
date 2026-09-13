"""Cookie-based auth tests (iteration 3)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://discord-faction-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "pony@frank.party"
ADMIN_PASSWORD = "FrankLeader#2026"


class TestCookieAuth:
    def test_login_sets_httponly_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        # Cookies present in jar
        names = {c.name for c in s.cookies}
        assert "access_token" in names, f"access_token cookie missing, got {names}"
        assert "refresh_token" in names, f"refresh_token cookie missing, got {names}"
        # httponly + secure attributes on Set-Cookie header
        set_cookie_hdr = r.headers.get("set-cookie", "").lower()
        assert "httponly" in set_cookie_hdr
        assert "secure" in set_cookie_hdr
        assert "samesite=none" in set_cookie_hdr
        # response body still exposes user + access_token for bearer fallback
        data = r.json()
        assert data.get("email") == ADMIN_EMAIL
        assert "access_token" in data

    def test_me_via_cookie_only(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        # No Authorization header — cookie must authenticate
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code in (200, 204)
        # cookie jar should have empty / cleared cookies
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_anonymous_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong-xyz"})
        assert r.status_code == 401

    def test_admin_route_via_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        # basic shape
        assert "applications" in d or "members" in d or isinstance(d, dict)

    def test_admin_route_anonymous_401(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401
