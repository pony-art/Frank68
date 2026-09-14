"""Discord bot for حزب محبين فرانك الجيزاوي.

Runs inside the same asyncio loop as FastAPI (started from the startup event).
All IDs/token come from environment variables. Missing IDs degrade gracefully:
the bot still comes online and does keyword detection + /حزب, while
notifications / auto-role activate once the relevant IDs are provided.
"""
import os
import time
import asyncio
import logging
from datetime import datetime, timezone

import discord
from discord import app_commands

logger = logging.getLogger("frank_party.bot")

# module-level singletons
_bot: "FrankBot | None" = None
_db = None
_task: "asyncio.Task | None" = None


def _env(key: str):
    v = os.environ.get(key, "").strip()
    return v or None


def _site_url() -> str:
    return os.environ.get("FRONTEND_URL", "").rstrip("/")


async def _cooldown_seconds() -> int:
    try:
        s = await _db.config.find_one({"_id": "settings"})
        return int(s.get("keyword_cooldown_seconds", 60)) if s else 60
    except Exception:
        return 60


async def _welcome_text() -> str:
    try:
        s = await _db.config.find_one({"_id": "settings"})
        if s and s.get("welcome_message"):
            return s["welcome_message"]
    except Exception:
        pass
    return "مرحباً بك في النخبة أيها العضو الجديد. فرانك يراقب... أثبت ولاءك."


def _party_embed() -> discord.Embed:
    url = _site_url()
    emb = discord.Embed(
        title="⚡ حزب محبين فرانك الجيزاوي",
        description=(
            "النظام السايبراني الأعظم لإدارة الأعضاء، الرتب، والولاء المطلق.\n\n"
            "**الخطوط الحمراء:** ممنوع الكذب · ممنوع تكون سيمب · ممنوع تسأل مين فرانك الجيزاوي.\n\n"
            f"🔗 **قدّم دلوقتي:** {url}"
        ),
        color=0xFF1E3C,
    )
    emb.set_footer(text="تحيا راية القائد بوني — والمجد للحزب")
    return emb


# ----------------------------------------------------------------------------
# Approve / Reject buttons
# ----------------------------------------------------------------------------
class ApplicationView(discord.ui.View):
    def __init__(self, app_id: str, discord_username: str):
        super().__init__(timeout=None)
        self.app_id = app_id
        self.discord_username = discord_username

    @discord.ui.button(label="قبول ✅", style=discord.ButtonStyle.success)
    async def approve_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        ok = await approve_application(self.app_id, by=str(interaction.user))
        if ok:
            await grant_role_and_welcome(self.discord_username)
            await self._finish(interaction, f"✅ تم قبول **{self.discord_username}** بواسطة {interaction.user.mention}")
        else:
            await interaction.followup.send("الطلب مش موجود أو اتراجع فيه قبل كده.", ephemeral=True)

    @discord.ui.button(label="رفض ❌", style=discord.ButtonStyle.danger)
    async def reject_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        ok = await reject_application(self.app_id, by=str(interaction.user))
        if ok:
            await self._finish(interaction, f"❌ تم رفض **{self.discord_username}** بواسطة {interaction.user.mention}")
        else:
            await interaction.followup.send("الطلب مش موجود أو اتراجع فيه قبل كده.", ephemeral=True)

    async def _finish(self, interaction: discord.Interaction, text: str):
        for child in self.children:
            child.disabled = True
        try:
            await interaction.message.edit(view=self)
        except Exception:
            pass
        await interaction.followup.send(text)


# ----------------------------------------------------------------------------
# Shared DB logic (used by both bot buttons and website API)
# ----------------------------------------------------------------------------
async def approve_application(app_id: str, by: str) -> bool:
    application = await _db.applications.find_one({"id": app_id})
    if not application or application.get("status") != "pending":
        return False
    await _db.applications.update_one({"id": app_id}, {"$set": {
        "status": "approved", "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": by}})
    existing = await _db.members.find_one({"discord_username": application["discord_username"]})
    if not existing:
        import uuid
        first_rank = await _db.ranks.find_one({}, sort=[("min_points", 1)])
        await _db.members.insert_one({
            "id": str(uuid.uuid4()), "discord_username": application["discord_username"],
            "rank": first_rank["name"] if first_rank else "مبتدئ", "points": 0, "badges": [],
            "joined_at": datetime.now(timezone.utc).isoformat()})
    import uuid
    await _db.logs.insert_one({"id": str(uuid.uuid4()), "action": "approve",
                               "target": application["discord_username"], "by": by,
                               "at": datetime.now(timezone.utc).isoformat()})
    return True


async def reject_application(app_id: str, by: str) -> bool:
    application = await _db.applications.find_one({"id": app_id})
    if not application or application.get("status") != "pending":
        return False
    import uuid
    await _db.applications.update_one({"id": app_id}, {"$set": {
        "status": "rejected", "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": by}})
    await _db.logs.insert_one({"id": str(uuid.uuid4()), "action": "reject",
                               "target": application["discord_username"], "by": by,
                               "at": datetime.now(timezone.utc).isoformat()})
    return True


def _find_member(guild: discord.Guild, username: str):
    """Best-effort match of a free-text discord username to a guild member."""
    if not username:
        return None
    uname = username.strip().lstrip("@")
    base = uname.split("#")[0].lower()
    m = guild.get_member_named(uname) or guild.get_member_named(base)
    if m:
        return m
    for member in guild.members:
        cands = {member.name.lower()}
        if member.global_name:
            cands.add(member.global_name.lower())
        cands.add(member.display_name.lower())
        if base in cands:
            return member
    return None


# ----------------------------------------------------------------------------
# Public coroutines called from the FastAPI app (same loop)
# ----------------------------------------------------------------------------
async def notify_new_application(app_doc: dict):
    """DM the admin + post to the notify channel with Approve/Reject buttons."""
    if not (_bot and _bot.is_ready()):
        return
    username = app_doc.get("discord_username", "؟")
    answers = app_doc.get("answers", {}) or {}
    emb = discord.Embed(title="📨 طلب انضمام جديد",
                        description=f"**اسم الديسكورد:** {username}", color=0xFF1E3C)
    if answers:
        joined = "\n".join(f"• {v}" for v in list(answers.values())[:6] if str(v).strip())
        if joined:
            emb.add_field(name="الإجابات", value=joined[:1000], inline=False)
    emb.set_footer(text="راجع الطلب من الأزرار تحت أو من لوحة تحكم القائد")

    view = ApplicationView(app_doc.get("id", ""), username)

    channel_id = _env("DISCORD_NOTIFY_CHANNEL_ID")
    if channel_id:
        try:
            ch = _bot.get_channel(int(channel_id)) or await _bot.fetch_channel(int(channel_id))
            await ch.send(embed=emb, view=view)
        except Exception as e:
            logger.warning(f"notify channel failed: {e}")

    admin_id = _env("DISCORD_ADMIN_USER_ID")
    if admin_id:
        try:
            user = _bot.get_user(int(admin_id)) or await _bot.fetch_user(int(admin_id))
            await user.send(embed=emb, view=ApplicationView(app_doc.get("id", ""), username))
        except Exception as e:
            logger.warning(f"admin DM failed: {e}")


async def grant_role_and_welcome(discord_username: str):
    """Assign the auto-role and DM a mysterious welcome to the approved member."""
    if not (_bot and _bot.is_ready()):
        return
    guild_id = _env("DISCORD_GUILD_ID")
    if not guild_id:
        return
    guild = _bot.get_guild(int(guild_id))
    if not guild:
        return
    member = _find_member(guild, discord_username)
    if not member:
        logger.info(f"member '{discord_username}' not found in guild for auto-role")
        return
    role_id = _env("DISCORD_AUTO_ROLE_ID") or _env("DISCORD_ROLE_ID")
    if role_id:
        role = guild.get_role(int(role_id))
        if role:
            try:
                await member.add_roles(role, reason="قبول في حزب فرانك")
            except discord.Forbidden:
                logger.warning("Missing permission / bot role below target role — cannot assign role")
            except Exception as e:
                logger.warning(f"add_roles failed: {e}")
    try:
        await member.send(await _welcome_text())
    except Exception:
        pass


# ----------------------------------------------------------------------------
# The bot client
# ----------------------------------------------------------------------------
class FrankBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        self.channel_cooldowns: dict[int, float] = {}
        self._register_commands()

    def _register_commands(self):
        @self.tree.command(name="حزب", description="عرض معلومات ورابط حزب محبين فرانك الجيزاوي")
        async def party_cmd(interaction: discord.Interaction):
            await interaction.response.send_message(embed=_party_embed())

        @self.tree.command(name="نقاطي", description="عرض رتبتك ونقاطك في الحزب")
        async def points_cmd(interaction: discord.Interaction):
            uname = interaction.user.name
            gname = interaction.user.global_name or ""
            member = await _db.members.find_one({"discord_username": {"$regex": f"^{uname}", "$options": "i"}})
            if not member and gname:
                member = await _db.members.find_one({"discord_username": {"$regex": f"^{gname}", "$options": "i"}})
            if not member:
                await interaction.response.send_message(
                    "مش لاقيينك في سجل الأعضاء. قدّم على الحزب الأول من الموقع.", ephemeral=True)
                return
            emb = discord.Embed(title=f"⚔️ {member['discord_username']}", color=0xFF1E3C)
            emb.add_field(name="الرتبة", value=member.get("rank", "مبتدئ"))
            emb.add_field(name="النقاط", value=str(member.get("points", 0)))
            badges = member.get("badges") or []
            if badges:
                emb.add_field(name="الشارات", value="، ".join(badges), inline=False)
            await interaction.response.send_message(embed=emb, ephemeral=True)

    async def setup_hook(self):
        guild_id = _env("DISCORD_GUILD_ID")
        try:
            if guild_id:
                guild = discord.Object(id=int(guild_id))
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
                logger.info("Slash commands synced to guild (instant)")
            else:
                await self.tree.sync()
                logger.info("Slash commands synced globally (may take up to 1h)")
        except Exception as e:
            logger.warning(f"command sync failed: {e}")

    async def on_ready(self):
        logger.info(f"[DISCORD-BOT] online as {self.user}")
        try:
            await _db.config.update_one({"_id": "settings"}, {"$set": {"bot_connected": True}})
        except Exception:
            pass

    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        content = message.content or ""
        if ("حزب محبين فرانك" in content) or ("حزب فرانك" in content):
            cd = await _cooldown_seconds()
            now = time.time()
            last = self.channel_cooldowns.get(message.channel.id, 0)
            if now - last >= cd:
                self.channel_cooldowns[message.channel.id] = now
                try:
                    await message.channel.send(embed=_party_embed())
                except Exception:
                    pass


async def _runner(token: str):
    global _bot
    _bot = FrankBot()
    try:
        await _bot.start(token)
    except discord.LoginFailure:
        logger.error("[DISCORD-BOT] توكن غير صالح — تأكد من التوكن في .env")
    except discord.PrivilegedIntentsRequired:
        logger.error("[DISCORD-BOT] فعّل Message Content + Server Members Intents من Developer Portal")
    except Exception as e:
        logger.error(f"[DISCORD-BOT] فشل التشغيل: {e}")
    finally:
        try:
            await _db.config.update_one({"_id": "settings"}, {"$set": {"bot_connected": False}})
        except Exception:
            pass


def start_bot(db):
    """Called from FastAPI startup. Non-blocking."""
    global _db, _task
    _db = db
    token = _env("DISCORD_BOT_TOKEN")
    if not token:
        logger.info("[DISCORD-BOT] لا يوجد توكن — البوت متوقف")
        return
    _task = asyncio.create_task(_runner(token))


async def stop_bot():
    if _bot:
        try:
            await _bot.close()
        except Exception:
            pass
