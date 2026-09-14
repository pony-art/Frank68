from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import jwt
import bcrypt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

import discord_bot

# ----------------------------------------------------------------------------
# DB / App setup
# ----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Frank El Gizawy Party API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("frank_party")

JWT_ALGORITHM = "HS256"


# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True,
                        samesite="none", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرّح — سجّل الدخول أولاً")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="نوع التوكن غير صالح")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="توكن غير صالح")


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    required: bool = True


class QuestionsUpdate(BaseModel):
    questions: List[Question]


class ApplicationCreate(BaseModel):
    discord_username: str
    answers: Dict[str, str] = {}
    agreed_rules: bool = False


class SiteContentUpdate(BaseModel):
    party_title: Optional[str] = None
    party_subtitle: Optional[str] = None
    about_text: Optional[str] = None
    party_rules: Optional[List[str]] = None
    fixed_rules: Optional[List[str]] = None


class MemberCreate(BaseModel):
    discord_username: str
    rank: Optional[str] = None
    points: int = 0


class PointsUpdate(BaseModel):
    delta: int
    reason: Optional[str] = ""


class RankCreate(BaseModel):
    name: str
    min_points: int = 0
    color: str = "#00F0FF"


class SettingsUpdate(BaseModel):
    discord_bot_token: Optional[str] = None
    discord_guild_id: Optional[str] = None
    discord_notify_channel_id: Optional[str] = None
    discord_admin_user_id: Optional[str] = None
    auto_role_id: Optional[str] = None
    welcome_message: Optional[str] = None
    website_url: Optional[str] = None
    keyword_cooldown_seconds: Optional[int] = None


class TraitorCreate(BaseModel):
    name: str
    role_before: Optional[str] = ""
    crime: str
    date: Optional[str] = ""


class BadgesUpdate(BaseModel):
    badges: List[str] = []


# ----------------------------------------------------------------------------
# Defaults / seeding
# ----------------------------------------------------------------------------
DEFAULT_CONTENT = {
    "_id": "site_content",
    "party_title": "حزب محبين فرانك الجيزاوي",
    "party_subtitle": "النظام السايبراني الأعظم لإدارة الأعضاء، الرتب، والولاء المطلق. هل أنت مستعد للانضمام للنخبة؟",
    "about_text": "نحن نخبة الديسكورد. حزب سرّي يجمع المخلصين تحت راية فرانك الجيزاوي. الولاء أولاً، والعزة دائماً.",
    "party_rules": [
        "احترم القائد بوني وكل أعضاء الحزب.",
        "ممنوع السبام أو الإزعاج في القنوات.",
        "النقاط تُمنح بالنشاط والولاء وتُخصم بالمخالفات.",
        "قرار القائد نهائي في القبول والرفض والترقية.",
    ],
    "fixed_rules": [
        "ممنوع الكذب تماماً داخل الحزب أو في الاستبيانات",
        "ممنوع تكون سيمب لأي شخص تحت أي ظرف",
        "ممنوع تسأل مين فرانك الجيزاوي (فرانك فوق الجميع والكل يعرف قدره)",
    ],
}

DEFAULT_QUESTIONS = [
    {"id": str(uuid.uuid4()), "text": "ليه عايز تنضم لحزب فرانك الجيزاوي؟", "required": True},
    {"id": str(uuid.uuid4()), "text": "قد إيه ولاءك للحزب من 1 لـ 10؟ وليه؟", "required": True},
    {"id": str(uuid.uuid4()), "text": "إيه اللي هتقدمه للحزب؟", "required": True},
]

DEFAULT_SETTINGS = {
    "_id": "settings",
    "discord_bot_token": "",
    "discord_guild_id": "",
    "discord_notify_channel_id": "",
    "discord_admin_user_id": "",
    "auto_role_id": "",
    "welcome_message": "مرحباً بك في النخبة أيها العضو الجديد. فرانك يراقب... أثبت ولاءك.",
    "website_url": os.environ.get("FRONTEND_URL", ""),
    "keyword_cooldown_seconds": 60,
    "bot_connected": False,
}


async def seed():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "القائد بوني", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.content.find_one({"_id": "site_content"}) is None:
        await db.content.insert_one(dict(DEFAULT_CONTENT))
    if await db.config.find_one({"_id": "questions"}) is None:
        await db.config.insert_one({"_id": "questions", "questions": DEFAULT_QUESTIONS})
    if await db.config.find_one({"_id": "settings"}) is None:
        await db.config.insert_one(dict(DEFAULT_SETTINGS))
    if await db.ranks.count_documents({}) == 0:
        base_ranks = [
            {"id": str(uuid.uuid4()), "name": "مبتدئ", "min_points": 0, "color": "#94A3B8"},
            {"id": str(uuid.uuid4()), "name": "عضو موثوق", "min_points": 100, "color": "#00F0FF"},
            {"id": str(uuid.uuid4()), "name": "نخبة", "min_points": 300, "color": "#D000FF"},
            {"id": str(uuid.uuid4()), "name": "يد القائد", "min_points": 700, "color": "#FF007A"},
        ]
        await db.ranks.insert_many(base_ranks)
    if await db.traitors.count_documents({}) == 0:
        await db.traitors.insert_one({
            "id": str(uuid.uuid4()),
            "name": "محمد صداح",
            "role_before": "الرئيس المؤسس (سابقاً)",
            "crime": "خيانة الحزب والهروب في نص الليل، ثم العودة كمجرم حرب والخيانة من جديد.",
            "date": "الزمن الأول",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


@app.on_event("startup")
async def on_startup():
    await seed()
    await db.config.update_one({"_id": "settings"}, {"$set": {"bot_connected": False}})
    discord_bot.start_bot(db)


@app.on_event("shutdown")
async def shutdown_db_client():
    await discord_bot.stop_bot()
    client.close()


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(payload: LoginInput, request: Request, response: Response):
    email = payload.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"_id": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="حاولت كتير — استنى 15 دقيقة وجرّب تاني")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        await db.login_attempts.update_one(
            {"_id": identifier},
            {"$set": {"count": count,
                      "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
                      if count >= 5 else None}},
            upsert=True)
        raise HTTPException(status_code=401, detail="الإيميل أو الباسورد غلط")

    await db.login_attempts.delete_one({"_id": identifier})
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name"), "role": user.get("role"),
            "access_token": access}


@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="لا يوجد توكن تحديث")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="نوع توكن غير صالح")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=True,
                            samesite="none", max_age=3600, path="/")
        return {"access_token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="توكن غير صالح")


# ----------------------------------------------------------------------------
# Public content routes
# ----------------------------------------------------------------------------
@api_router.get("/content")
async def get_content():
    doc = await db.content.find_one({"_id": "site_content"})
    doc.pop("_id", None)
    return doc


@api_router.get("/questions")
async def get_questions():
    doc = await db.config.find_one({"_id": "questions"})
    return doc.get("questions", [])


@api_router.get("/stats")
async def get_stats():
    members = await db.members.count_documents({})
    approved = await db.applications.count_documents({"status": "approved"})
    pending = await db.applications.count_documents({"status": "pending"})
    agg = await db.members.aggregate([{"$group": {"_id": None, "total": {"$sum": "$points"}}}]).to_list(1)
    total_points = agg[0]["total"] if agg else 0
    settings = await db.config.find_one({"_id": "settings"})
    return {"members": members, "approved": approved, "pending": pending,
            "total_points": total_points, "bot_connected": settings.get("bot_connected", False)}


@api_router.get("/bot-status")
async def bot_status():
    settings = await db.config.find_one({"_id": "settings"})
    return {"connected": settings.get("bot_connected", False),
            "website_url": settings.get("website_url", "")}


# ----------------------------------------------------------------------------
# Applications
# ----------------------------------------------------------------------------
@api_router.post("/applications")
async def submit_application(payload: ApplicationCreate):
    if not payload.discord_username.strip():
        raise HTTPException(status_code=400, detail="اسم الديسكورد مطلوب")
    if not payload.agreed_rules:
        raise HTTPException(status_code=400, detail="لازم توافق على قوانين الحزب")
    doc = {
        "id": str(uuid.uuid4()),
        "discord_username": payload.discord_username.strip(),
        "answers": payload.answers,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None,
    }
    await db.applications.insert_one(dict(doc))
    logger.info(f"[DISCORD-NOTIFY] طلب جديد من {doc['discord_username']} — إشعار للقائد (DM + قناة)")
    try:
        await discord_bot.notify_new_application(doc)
    except Exception as e:
        logger.warning(f"discord notify failed: {e}")
    doc.pop("_id", None)
    return doc


@api_router.get("/applications")
async def list_applications(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"status": status} if status else {}
    apps = await db.applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return apps


@api_router.post("/applications/{app_id}/approve")
async def approve_application(app_id: str, user: dict = Depends(get_current_user)):
    application = await db.applications.find_one({"id": app_id})
    if not application:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    await db.applications.update_one({"id": app_id}, {"$set": {
        "status": "approved", "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": user["email"]}})
    existing_member = await db.members.find_one({"discord_username": application["discord_username"]})
    if not existing_member:
        first_rank = await db.ranks.find_one({}, sort=[("min_points", 1)])
        await db.members.insert_one({
            "id": str(uuid.uuid4()),
            "discord_username": application["discord_username"],
            "rank": first_rank["name"] if first_rank else "مبتدئ",
            "points": 0,
            "joined_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.logs.insert_one({"id": str(uuid.uuid4()), "action": "approve",
                              "target": application["discord_username"], "by": user["email"],
                              "at": datetime.now(timezone.utc).isoformat()})
    logger.info(f"[DISCORD-BOT] قبول {application['discord_username']} — إعطاء رتبة + رسالة ترحيب غامضة")
    try:
        await discord_bot.grant_role_and_welcome(application["discord_username"])
    except Exception as e:
        logger.warning(f"discord role grant failed: {e}")
    return {"ok": True}


@api_router.post("/applications/{app_id}/reject")
async def reject_application(app_id: str, user: dict = Depends(get_current_user)):
    application = await db.applications.find_one({"id": app_id})
    if not application:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    await db.applications.update_one({"id": app_id}, {"$set": {
        "status": "rejected", "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": user["email"]}})
    await db.logs.insert_one({"id": str(uuid.uuid4()), "action": "reject",
                              "target": application["discord_username"], "by": user["email"],
                              "at": datetime.now(timezone.utc).isoformat()})
    logger.info(f"[DISCORD-BOT] رفض {application['discord_username']}")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Members & Points
# ----------------------------------------------------------------------------
def resolve_rank(ranks: List[dict], points: int) -> str:
    eligible = [r for r in ranks if points >= r.get("min_points", 0)]
    if not eligible:
        return ranks[0]["name"] if ranks else "مبتدئ"
    return max(eligible, key=lambda r: r.get("min_points", 0))["name"]


@api_router.get("/members")
async def list_members(user: dict = Depends(get_current_user)):
    members = await db.members.find({}, {"_id": 0}).sort("points", -1).to_list(1000)
    return members


@api_router.post("/members")
async def create_member(payload: MemberCreate, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "discord_username": payload.discord_username.strip(),
           "rank": payload.rank or "مبتدئ", "points": payload.points, "badges": [],
           "joined_at": datetime.now(timezone.utc).isoformat()}
    await db.members.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.post("/members/{member_id}/badges")
async def set_badges(member_id: str, payload: BadgesUpdate, user: dict = Depends(get_current_user)):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="العضو غير موجود")
    badges = list(dict.fromkeys([b.strip() for b in payload.badges if b.strip()]))
    await db.members.update_one({"id": member_id}, {"$set": {"badges": badges}})
    return {"ok": True, "badges": badges}


@api_router.post("/members/{member_id}/points")
async def update_points(member_id: str, payload: PointsUpdate, user: dict = Depends(get_current_user)):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="العضو غير موجود")
    new_points = max(0, member.get("points", 0) + payload.delta)
    ranks = await db.ranks.find({}, {"_id": 0}).to_list(1000)
    new_rank = resolve_rank(ranks, new_points)
    await db.members.update_one({"id": member_id}, {"$set": {"points": new_points, "rank": new_rank}})
    await db.logs.insert_one({"id": str(uuid.uuid4()), "action": "points",
                              "target": member["discord_username"],
                              "detail": f"{'+' if payload.delta >= 0 else ''}{payload.delta} ({payload.reason})",
                              "by": user["email"], "at": datetime.now(timezone.utc).isoformat()})
    return {"ok": True, "points": new_points, "rank": new_rank}


@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, user: dict = Depends(get_current_user)):
    await db.members.delete_one({"id": member_id})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Ranks
# ----------------------------------------------------------------------------
@api_router.get("/ranks")
async def list_ranks():
    return await db.ranks.find({}, {"_id": 0}).sort("min_points", 1).to_list(1000)


@api_router.post("/ranks")
async def create_rank(payload: RankCreate, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "name": payload.name, "min_points": payload.min_points,
           "color": payload.color}
    await db.ranks.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.delete("/ranks/{rank_id}")
async def delete_rank(rank_id: str, user: dict = Depends(get_current_user)):
    await db.ranks.delete_one({"id": rank_id})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Admin content / settings
# ----------------------------------------------------------------------------
@api_router.put("/content")
async def update_content(payload: SiteContentUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.content.update_one({"_id": "site_content"}, {"$set": update})
    doc = await db.content.find_one({"_id": "site_content"})
    doc.pop("_id", None)
    return doc


@api_router.put("/questions")
async def update_questions(payload: QuestionsUpdate, user: dict = Depends(get_current_user)):
    questions = [q.model_dump() for q in payload.questions]
    await db.config.update_one({"_id": "questions"}, {"$set": {"questions": questions}})
    return questions


@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    doc = await db.config.find_one({"_id": "settings"})
    doc.pop("_id", None)
    return doc


@api_router.put("/settings")
async def update_settings(payload: SettingsUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.config.update_one({"_id": "settings"}, {"$set": update})
    doc = await db.config.find_one({"_id": "settings"})
    doc.pop("_id", None)
    return doc


@api_router.get("/logs")
async def list_logs(user: dict = Depends(get_current_user)):
    return await db.logs.find({}, {"_id": 0}).sort("at", -1).to_list(200)


# ----------------------------------------------------------------------------
# Hall of Shame (traitors)
# ----------------------------------------------------------------------------
@api_router.get("/traitors")
async def list_traitors():
    return await db.traitors.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/traitors")
async def create_traitor(payload: TraitorCreate, user: dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "name": payload.name.strip(),
           "role_before": payload.role_before or "", "crime": payload.crime.strip(),
           "date": payload.date or "", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.traitors.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.delete("/traitors/{traitor_id}")
async def delete_traitor(traitor_id: str, user: dict = Depends(get_current_user)):
    await db.traitors.delete_one({"id": traitor_id})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Admin stats (for charts)
# ----------------------------------------------------------------------------
@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    pending = await db.applications.count_documents({"status": "pending"})
    approved = await db.applications.count_documents({"status": "approved"})
    rejected = await db.applications.count_documents({"status": "rejected"})
    members_total = await db.members.count_documents({})
    traitors_total = await db.traitors.count_documents({})
    members = await db.members.find({}, {"_id": 0, "rank": 1}).to_list(2000)
    by_rank_map: Dict[str, int] = {}
    for m in members:
        r = m.get("rank", "غير محدد")
        by_rank_map[r] = by_rank_map.get(r, 0) + 1
    members_by_rank = [{"rank": k, "count": v} for k, v in by_rank_map.items()]
    return {
        "applications_by_status": [
            {"status": "قيد المراجعة", "count": pending},
            {"status": "مقبول", "count": approved},
            {"status": "مرفوض", "count": rejected},
        ],
        "members_total": members_total,
        "traitors_total": traitors_total,
        "members_by_rank": members_by_rank,
    }


# ----------------------------------------------------------------------------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"),
                   "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
