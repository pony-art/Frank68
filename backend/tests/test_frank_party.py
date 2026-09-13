"""Backend API tests for Frank El Gizawy Party."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://discord-faction-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "pony@frank.party"
ADMIN_PASSWORD = "FrankLeader#2026"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    token = data["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return token


# ---- Auth ----
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_login_success(self, session, auth):
        assert auth

    def test_me(self, session, auth):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---- Public ----
class TestPublic:
    def test_content(self):
        r = requests.get(f"{API}/content")
        assert r.status_code == 200
        d = r.json()
        assert "party_title" in d and "party_rules" in d and "fixed_rules" in d

    def test_questions(self):
        r = requests.get(f"{API}/questions")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stats(self):
        r = requests.get(f"{API}/stats")
        assert r.status_code == 200
        for k in ("members", "approved", "pending", "total_points"):
            assert k in r.json()

    def test_bot_status(self):
        r = requests.get(f"{API}/bot-status")
        assert r.status_code == 200
        assert "connected" in r.json()


# ---- Applications flow ----
class TestApplications:
    def test_submit_requires_agreement(self):
        r = requests.post(f"{API}/applications",
                          json={"discord_username": "TEST_x", "answers": {}, "agreed_rules": False})
        assert r.status_code == 400

    def test_submit_requires_username(self):
        r = requests.post(f"{API}/applications",
                          json={"discord_username": "  ", "answers": {}, "agreed_rules": True})
        assert r.status_code == 400

    def test_full_cycle_approve(self, session, auth):
        uname = f"TEST_user_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/applications",
                          json={"discord_username": uname, "answers": {"q1": "a"}, "agreed_rules": True})
        assert r.status_code == 200
        app_id = r.json()["id"]

        # list pending
        r = session.get(f"{API}/applications", params={"status": "pending"})
        assert r.status_code == 200
        assert any(a["id"] == app_id for a in r.json())

        # approve
        r = session.post(f"{API}/applications/{app_id}/approve")
        assert r.status_code == 200

        # member should exist
        r = session.get(f"{API}/members")
        assert r.status_code == 200
        members = r.json()
        mem = next((m for m in members if m["discord_username"] == uname), None)
        assert mem is not None
        pytest.approved_member_id = mem["id"]
        pytest.approved_username = uname

    def test_full_cycle_reject(self, session, auth):
        uname = f"TEST_rej_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/applications",
                          json={"discord_username": uname, "answers": {}, "agreed_rules": True})
        app_id = r.json()["id"]
        r = session.post(f"{API}/applications/{app_id}/reject")
        assert r.status_code == 200

        r = session.get(f"{API}/applications", params={"status": "rejected"})
        assert any(a["id"] == app_id for a in r.json())


# ---- Members & Points ----
class TestMembers:
    def test_create_and_delete(self, session, auth):
        uname = f"TEST_m_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/members", json={"discord_username": uname, "points": 0})
        assert r.status_code == 200
        mid = r.json()["id"]
        assert r.json()["discord_username"] == uname
        r = session.delete(f"{API}/members/{mid}")
        assert r.status_code == 200

    def test_points_recompute_rank(self, session, auth):
        uname = f"TEST_p_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/members", json={"discord_username": uname, "points": 0})
        mid = r.json()["id"]
        r = session.post(f"{API}/members/{mid}/points", json={"delta": 350, "reason": "test"})
        assert r.status_code == 200
        d = r.json()
        assert d["points"] == 350
        assert d["rank"]  # rank auto-updated
        # subtract
        r = session.post(f"{API}/members/{mid}/points", json={"delta": -1000, "reason": "test"})
        assert r.status_code == 200
        assert r.json()["points"] == 0  # clamped
        session.delete(f"{API}/members/{mid}")


# ---- Ranks ----
class TestRanks:
    def test_public_ranks(self):
        r = requests.get(f"{API}/ranks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_delete_rank(self, session, auth):
        r = session.post(f"{API}/ranks",
                         json={"name": f"TEST_rank_{uuid.uuid4().hex[:4]}", "min_points": 999, "color": "#FF00FF"})
        assert r.status_code == 200
        rid = r.json()["id"]
        r = session.delete(f"{API}/ranks/{rid}")
        assert r.status_code == 200


# ---- Content, Questions, Settings ----
class TestAdminEdits:
    def test_update_content(self, session, auth):
        r = session.get(f"{API}/content")
        original = r.json()
        r = session.put(f"{API}/content", json={"party_title": "TEST_TITLE"})
        assert r.status_code == 200
        assert r.json()["party_title"] == "TEST_TITLE"
        # restore
        session.put(f"{API}/content", json={"party_title": original["party_title"]})

    def test_update_questions(self, session, auth):
        r = session.get(f"{API}/questions")
        original = r.json()
        new_q = [{"id": str(uuid.uuid4()), "text": "TEST_Q?", "required": True}]
        r = session.put(f"{API}/questions", json={"questions": new_q})
        assert r.status_code == 200
        assert r.json()[0]["text"] == "TEST_Q?"
        # restore
        session.put(f"{API}/questions", json={"questions": original})

    def test_settings(self, session, auth):
        r = session.get(f"{API}/settings")
        assert r.status_code == 200
        r = session.put(f"{API}/settings", json={"welcome_message": "TEST_HELLO"})
        assert r.status_code == 200
        assert r.json()["welcome_message"] == "TEST_HELLO"

    def test_settings_unauth(self):
        r = requests.get(f"{API}/settings")
        assert r.status_code == 401
