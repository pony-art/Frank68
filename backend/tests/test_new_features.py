"""Backend API tests for NEW features: traitors, badges, admin stats, logs."""
import os
import uuid
import pytest
import requests
from pathlib import Path

def _load_frontend_env():
    env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_frontend_env()
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "bony@frank.party"
ADMIN_PASSWORD = "FrankLeader#2026"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---- Traitors ----
class TestTraitors:
    def test_public_list_has_seed(self):
        r = requests.get(f"{API}/traitors")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any("صداح" in t.get("name", "") for t in data), f"seed traitor missing: {data}"

    def test_create_and_delete(self, session):
        name = f"TEST_traitor_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/traitors",
                         json={"name": name, "crime": "TEST_crime", "role_before": "X", "date": "2026"})
        assert r.status_code == 200
        tid = r.json()["id"]
        assert r.json()["name"] == name

        # visible on public endpoint
        r2 = requests.get(f"{API}/traitors")
        assert any(t["id"] == tid for t in r2.json())

        r = session.delete(f"{API}/traitors/{tid}")
        assert r.status_code == 200
        r2 = requests.get(f"{API}/traitors")
        assert not any(t["id"] == tid for t in r2.json())

    def test_create_unauth(self):
        r = requests.post(f"{API}/traitors", json={"name": "x", "crime": "y"})
        assert r.status_code == 401


# ---- Badges ----
class TestBadges:
    def test_set_and_persist(self, session):
        uname = f"TEST_badge_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/members", json={"discord_username": uname, "points": 0})
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            r = session.post(f"{API}/members/{mid}/badges", json={"badges": ["ولاء", "نخبة"]})
            assert r.status_code == 200
            assert r.json()["badges"] == ["ولاء", "نخبة"]

            # verify persisted
            r = session.get(f"{API}/members")
            m = next(x for x in r.json() if x["id"] == mid)
            assert m["badges"] == ["ولاء", "نخبة"]

            # remove one
            r = session.post(f"{API}/members/{mid}/badges", json={"badges": ["ولاء"]})
            assert r.json()["badges"] == ["ولاء"]
        finally:
            session.delete(f"{API}/members/{mid}")

    def test_badges_dedupe_strip(self, session):
        uname = f"TEST_bd_{uuid.uuid4().hex[:6]}"
        mid = session.post(f"{API}/members", json={"discord_username": uname}).json()["id"]
        try:
            r = session.post(f"{API}/members/{mid}/badges",
                             json={"badges": [" A ", "A", "B", "  "]})
            assert r.json()["badges"] == ["A", "B"]
        finally:
            session.delete(f"{API}/members/{mid}")

    def test_badges_unknown_member(self, session):
        r = session.post(f"{API}/members/nope/badges", json={"badges": []})
        assert r.status_code == 404


# ---- Admin stats ----
class TestAdminStats:
    def test_stats_shape(self, session):
        r = session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("applications_by_status", "members_total", "traitors_total", "members_by_rank"):
            assert k in d
        assert isinstance(d["applications_by_status"], list)
        assert len(d["applications_by_status"]) == 3
        assert isinstance(d["members_by_rank"], list)

    def test_stats_unauth(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401


# ---- Logs ----
class TestLogs:
    def test_logs_list_and_new_entry(self, session):
        # create member + change points to generate a log
        uname = f"TEST_log_{uuid.uuid4().hex[:6]}"
        mid = session.post(f"{API}/members", json={"discord_username": uname}).json()["id"]
        try:
            session.post(f"{API}/members/{mid}/points", json={"delta": 5, "reason": "test"})
            r = session.get(f"{API}/logs")
            assert r.status_code == 200
            logs = r.json()
            assert isinstance(logs, list)
            assert any(l.get("target") == uname and l.get("action") == "points" for l in logs)
        finally:
            session.delete(f"{API}/members/{mid}")

    def test_logs_unauth(self):
        r = requests.get(f"{API}/logs")
        assert r.status_code == 401
