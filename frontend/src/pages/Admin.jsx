import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Inbox, Users, Coins, Crown, FileEdit, Bot, LogOut, Check, X,
  Plus, Minus, Trash2, Save, Loader2, Clock, Skull, BarChart3, ScrollText, Award,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { id: "applications", name: "الطلبات", icon: Inbox, testid: "admin-tab-applications" },
  { id: "members", name: "الأعضاء", icon: Users, testid: "admin-tab-members" },
  { id: "points", name: "النقاط", icon: Coins, testid: "admin-tab-points" },
  { id: "ranks", name: "الرتب", icon: Crown, testid: "admin-tab-ranks" },
  { id: "shame", name: "سجل الخونة", icon: Skull, testid: "admin-tab-shame" },
  { id: "stats", name: "الإحصائيات", icon: BarChart3, testid: "admin-tab-stats" },
  { id: "logs", name: "السجل", icon: ScrollText, testid: "admin-tab-logs" },
  { id: "editor", name: "المحتوى", icon: FileEdit, testid: "admin-tab-editor" },
  { id: "discord", name: "البوت", icon: Bot, testid: "admin-tab-discord" },
];

function err(e) {
  toast.error(formatApiErrorDetail(e.response?.data?.detail));
}

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("applications");

  useEffect(() => {
    if (user === false) navigate("/login");
  }, [user, navigate]);

  if (user === null)
    return (
      <div className="relative z-10 min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-red-400" size={40} />
      </div>
    );
  if (!user) return null;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-5 pt-28 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-red-400">
            Leader Control Center
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold neon-cyan">
            لوحة تحكم القائد
          </h1>
        </div>
        <button
          onClick={logout}
          data-testid="admin-logout-button"
          className="cyber-btn-pink cyber-btn rounded-lg px-5 py-2.5 text-sm font-bold flex items-center gap-2"
        >
          <LogOut size={16} /> خروج
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/5 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              data-testid={t.testid}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                tab === t.id
                  ? "bg-red-500/15 text-red-300 border border-red-500/40"
                  : "text-slate-400 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon size={16} /> {t.name}
            </button>
          );
        })}
      </div>

      {tab === "applications" && <Applications />}
      {tab === "members" && <Members />}
      {tab === "points" && <Points />}
      {tab === "ranks" && <Ranks />}
      {tab === "shame" && <Shame />}
      {tab === "stats" && <Stats />}
      {tab === "logs" && <Logs />}
      {tab === "editor" && <Editor />}
      {tab === "discord" && <Discord />}
    </div>
  );
}

/* ---------------- Applications ---------------- */
function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/applications"), api.get("/questions")])
      .then(([a, q]) => {
        setApps(a.data);
        setQuestions(q.data);
      })
      .catch(err)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const act = async (id, action) => {
    try {
      await api.post(`/applications/${id}/${action}`);
      toast.success(action === "approve" ? "تم القبول ✓ البوت هيدي الرتبة" : "تم الرفض");
      load();
    } catch (e) {
      err(e);
    }
  };

  const qText = (qid) => questions.find((q) => q.id === qid)?.text || qid;

  if (loading) return <Spinner />;
  if (!apps.length) return <Empty text="مفيش طلبات دلوقتي" />;

  return (
    <div className="space-y-4" data-testid="applications-list">
      {apps.map((a) => (
        <div key={a.id} className="cyber-card rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-lg text-red-300">{a.discord_username}</div>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                <Clock size={12} /> {new Date(a.created_at).toLocaleString("ar-EG")}
              </div>
            </div>
            <StatusBadge status={a.status} />
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(a.answers || {}).map(([qid, ans]) => (
              <div key={qid} className="text-sm">
                <span className="text-slate-400">{qText(qid)}: </span>
                <span className="text-slate-200">{ans || "—"}</span>
              </div>
            ))}
          </div>

          {a.status === "pending" && (
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => act(a.id, "approve")}
                data-testid="admin-approve-application-button"
                className="cyber-btn rounded-lg px-5 py-2 text-sm font-bold flex items-center gap-2"
              >
                <Check size={16} /> قبول
              </button>
              <button
                onClick={() => act(a.id, "reject")}
                data-testid="admin-reject-application-button"
                className="cyber-btn-pink cyber-btn rounded-lg px-5 py-2 text-sm font-bold flex items-center gap-2"
              >
                <X size={16} /> رفض
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Members ---------------- */
function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [badgeInput, setBadgeInput] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get("/members").then((r) => setMembers(r.data)).catch(err).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.post("/members", { discord_username: name.trim() });
      setName("");
      toast.success("تمت إضافة العضو");
      load();
    } catch (e) {
      err(e);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/members/${id}`);
      toast.success("تم حذف العضو");
      load();
    } catch (e) {
      err(e);
    }
  };

  const saveBadges = async (m, badges) => {
    try {
      await api.post(`/members/${m.id}/badges`, { badges });
      load();
    } catch (e) {
      err(e);
    }
  };
  const addBadge = (m) => {
    const val = (badgeInput[m.id] || "").trim();
    if (!val) return;
    saveBadges(m, [...(m.badges || []), val]);
    setBadgeInput((s) => ({ ...s, [m.id]: "" }));
  };
  const removeBadge = (m, b) => saveBadges(m, (m.badges || []).filter((x) => x !== b));

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم ديسكورد لإضافة عضو يدوياً"
          data-testid="input-new-member"
          className="cyber-input rounded-lg px-4 py-2.5 flex-1 text-right"
        />
        <button
          onClick={add}
          data-testid="admin-add-member-button"
          className="cyber-btn rounded-lg px-5 py-2.5 font-bold flex items-center gap-2"
        >
          <Plus size={16} /> إضافة
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : !members.length ? (
        <Empty text="مفيش أعضاء لسه" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4" data-testid="members-list">
          {members.map((m) => (
            <div key={m.id} className="cyber-card rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-red-300">{m.discord_username}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    <span className="text-rose-400">{m.rank}</span> · {m.points} نقطة
                  </div>
                </div>
                <button
                  onClick={() => del(m.id)}
                  className="text-rose-400 hover:text-rose-300 p-2"
                  data-testid="admin-delete-member-button"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                  <Award size={13} className="text-red-400" /> الشارات
                </div>
                <div className="flex flex-wrap gap-2 mb-2" data-testid={`member-badges-${m.id}`}>
                  {(m.badges || []).length === 0 && (
                    <span className="text-xs text-slate-600">لا توجد شارات</span>
                  )}
                  {(m.badges || []).map((b) => (
                    <span
                      key={b}
                      className="text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-200 flex items-center gap-1"
                    >
                      {b}
                      <button onClick={() => removeBadge(m, b)} className="hover:text-white">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={badgeInput[m.id] || ""}
                    onChange={(e) => setBadgeInput((s) => ({ ...s, [m.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addBadge(m)}
                    placeholder="شارة جديدة (مثلاً: مؤسس)"
                    data-testid={`input-badge-${m.id}`}
                    className="cyber-input rounded-lg px-3 py-1.5 flex-1 text-right text-sm"
                  />
                  <button
                    onClick={() => addBadge(m)}
                    data-testid={`add-badge-${m.id}`}
                    className="cyber-btn rounded-lg px-3 py-1.5 text-sm font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Points ---------------- */
function Points() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get("/members").then((r) => setMembers(r.data)).catch(err).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const change = async (id, sign) => {
    const val = parseInt(amounts[id] || "10", 10);
    if (isNaN(val)) return;
    try {
      const { data } = await api.post(`/members/${id}/points`, {
        delta: sign * Math.abs(val),
        reason: "تعديل يدوي من القائد",
      });
      toast.success(`النقاط: ${data.points} · الرتبة: ${data.rank}`);
      load();
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <Spinner />;
  if (!members.length) return <Empty text="أضف أعضاء الأول من تبويب الأعضاء" />;

  return (
    <div className="space-y-4" data-testid="points-list">
      {members.map((m) => (
        <div key={m.id} className="cyber-card rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-bold text-red-300">{m.discord_username}</div>
            <div className="text-sm text-slate-400 mt-1">
              <span className="text-rose-400">{m.rank}</span> ·{" "}
              <span className="neon-gradient-text font-bold">{m.points}</span> نقطة
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => change(m.id, 1)}
              data-testid="admin-add-points-button"
              className="cyber-btn rounded-lg p-2.5"
            >
              <Plus size={16} />
            </button>
            <input
              value={amounts[m.id] || ""}
              onChange={(e) => setAmounts((a) => ({ ...a, [m.id]: e.target.value }))}
              placeholder="10"
              className="cyber-input rounded-lg px-3 py-2 w-20 text-center"
            />
            <button
              onClick={() => change(m.id, -1)}
              data-testid="admin-remove-points-button"
              className="cyber-btn-pink cyber-btn rounded-lg p-2.5"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Ranks ---------------- */
function Ranks() {
  const [ranks, setRanks] = useState([]);
  const [name, setName] = useState("");
  const [min, setMin] = useState("");
  const [color, setColor] = useState("#FF1E3C");

  const load = useCallback(() => {
    api.get("/ranks").then((r) => setRanks(r.data)).catch(err);
  }, []);
  useEffect(() => load(), [load]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.post("/ranks", { name: name.trim(), min_points: parseInt(min || "0", 10), color });
      setName("");
      setMin("");
      toast.success("تمت إضافة الرتبة");
      load();
    } catch (e) {
      err(e);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/ranks/${id}`);
      toast.success("تم حذف الرتبة");
      load();
    } catch (e) {
      err(e);
    }
  };

  return (
    <div>
      <div className="cyber-card rounded-xl p-5 mb-6 grid sm:grid-cols-4 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الرتبة"
          data-testid="input-rank-name"
          className="cyber-input rounded-lg px-4 py-2.5 text-right sm:col-span-2"
        />
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="أقل نقاط"
          type="number"
          data-testid="input-rank-points"
          className="cyber-input rounded-lg px-4 py-2.5 text-right"
        />
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-11 h-11 rounded-lg bg-transparent border border-white/10 cursor-pointer"
          />
          <button
            onClick={add}
            data-testid="admin-add-rank-button"
            className="cyber-btn rounded-lg px-4 py-2.5 font-bold flex-1 flex items-center justify-center gap-1"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3" data-testid="ranks-list">
        {ranks.map((r) => (
          <div key={r.id} className="cyber-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{ background: r.color, boxShadow: `0 0 12px ${r.color}` }} />
              <span className="font-bold text-lg" style={{ color: r.color }}>{r.name}</span>
              <span className="text-sm text-slate-400 font-mono">من {r.min_points} نقطة</span>
            </div>
            <button onClick={() => del(r.id)} className="text-rose-400 hover:text-rose-300 p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Content Editor ---------------- */
function Editor() {
  const [content, setContent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/content").then((r) => setContent(r.data)).catch(err);
    api.get("/questions").then((r) => setQuestions(r.data)).catch(err);
  }, []);

  if (!content) return <Spinner />;

  const setField = (k, v) => setContent((c) => ({ ...c, [k]: v }));
  const setList = (k, i, v) => setContent((c) => {
    const arr = [...(c[k] || [])];
    arr[i] = v;
    return { ...c, [k]: arr };
  });
  const addListItem = (k) => setContent((c) => ({ ...c, [k]: [...(c[k] || []), ""] }));
  const removeListItem = (k, i) => setContent((c) => ({ ...c, [k]: c[k].filter((_, idx) => idx !== i) }));

  const saveContent = async () => {
    setSaving(true);
    try {
      await api.put("/content", {
        party_title: content.party_title,
        party_subtitle: content.party_subtitle,
        about_text: content.about_text,
        party_rules: content.party_rules,
        fixed_rules: content.fixed_rules,
      });
      toast.success("تم حفظ نصوص الموقع");
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };

  const saveQuestions = async () => {
    try {
      await api.put("/questions", { questions });
      toast.success("تم حفظ أسئلة التقديم");
    } catch (e) {
      err(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="cyber-card rounded-xl p-6 space-y-4">
        <h3 className="font-display text-xl font-bold text-red-300">نصوص الموقع</h3>
        <Field label="عنوان الحزب" value={content.party_title} onChange={(v) => setField("party_title", v)} testid="edit-party-title" />
        <Field label="الوصف تحت العنوان" value={content.party_subtitle} onChange={(v) => setField("party_subtitle", v)} textarea testid="edit-party-subtitle" />
        <Field label="نبذة عن الحزب" value={content.about_text} onChange={(v) => setField("about_text", v)} textarea testid="edit-about" />

        <ListEditor title="قوانين الحزب" k="party_rules" items={content.party_rules} setList={setList} add={addListItem} remove={removeListItem} />
        <ListEditor title="الخطوط الحمراء الثابتة" k="fixed_rules" items={content.fixed_rules} setList={setList} add={addListItem} remove={removeListItem} />

        <button onClick={saveContent} disabled={saving} data-testid="admin-update-rules-button" className="cyber-btn rounded-lg px-6 py-3 font-bold flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ النصوص
        </button>
      </div>

      <div className="cyber-card rounded-xl p-6 space-y-4">
        <h3 className="font-display text-xl font-bold text-rose-300">أسئلة التقديم</h3>
        {questions.map((q, i) => (
          <div key={q.id} className="flex gap-2 items-center">
            <input
              value={q.text}
              onChange={(e) => setQuestions((qs) => qs.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
              className="cyber-input rounded-lg px-4 py-2.5 flex-1 text-right"
            />
            <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-rose-400 p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="flex gap-3">
          <button
            onClick={() => setQuestions((qs) => [...qs, { id: crypto.randomUUID(), text: "سؤال جديد", required: true }])}
            className="cyber-btn-pink cyber-btn rounded-lg px-5 py-2.5 font-bold flex items-center gap-2"
          >
            <Plus size={16} /> سؤال
          </button>
          <button onClick={saveQuestions} data-testid="admin-save-questions-button" className="cyber-btn rounded-lg px-5 py-2.5 font-bold flex items-center gap-2">
            <Save size={16} /> حفظ الأسئلة
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Discord settings ---------------- */
function Discord() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setS(r.data)).catch(err);
  }, []);

  if (!s) return <Spinner />;

  const setField = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", {
        discord_bot_token: s.discord_bot_token,
        discord_guild_id: s.discord_guild_id,
        discord_notify_channel_id: s.discord_notify_channel_id,
        discord_admin_user_id: s.discord_admin_user_id,
        auto_role_id: s.auto_role_id,
        welcome_message: s.welcome_message,
        website_url: s.website_url,
        keyword_cooldown_seconds: parseInt(s.keyword_cooldown_seconds || 60, 10),
      });
      toast.success("تم حفظ إعدادات البوت");
    } catch (e) {
      err(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cyber-card rounded-xl p-6 space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200 leading-relaxed">
        ⚠️ البوت لسه مش مربوط. جهّز التوكن والـ IDs هنا، وبعدها هنشغّل البوت ويبدأ
        يبعت إشعارات ويدي رتب أوتوماتيك. لازم رتبة البوت في السيرفر تكون فوق الرتبة اللي بيوزّعها.
      </div>
      <Field label="Bot Token" value={s.discord_bot_token} onChange={(v) => setField("discord_bot_token", v)} testid="edit-bot-token" mono />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Server (Guild) ID" value={s.discord_guild_id} onChange={(v) => setField("discord_guild_id", v)} mono />
        <Field label="قناة الإشعارات ID" value={s.discord_notify_channel_id} onChange={(v) => setField("discord_notify_channel_id", v)} mono />
        <Field label="ID القائد (للـ DM)" value={s.discord_admin_user_id} onChange={(v) => setField("discord_admin_user_id", v)} mono />
        <Field label="ID رتبة القبول الأوتوماتيك" value={s.auto_role_id} onChange={(v) => setField("auto_role_id", v)} mono />
      </div>
      <Field label="رسالة الترحيب الغامضة" value={s.welcome_message} onChange={(v) => setField("welcome_message", v)} textarea />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="رابط الموقع (لأمر /حزب)" value={s.website_url} onChange={(v) => setField("website_url", v)} mono />
        <Field label="Cooldown كشف الكلمات (ثانية)" value={String(s.keyword_cooldown_seconds ?? 60)} onChange={(v) => setField("keyword_cooldown_seconds", v)} mono />
      </div>
      <button onClick={save} disabled={saving} data-testid="admin-save-settings-button" className="cyber-btn rounded-lg px-6 py-3 font-bold flex items-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ الإعدادات
      </button>
    </div>
  );
}

/* ---------------- Hall of Shame (traitors) ---------------- */
function Shame() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", role_before: "", crime: "", date: "" });

  const load = useCallback(() => {
    setLoading(true);
    api.get("/traitors").then((r) => setList(r.data)).catch(err).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const add = async () => {
    if (!f.name.trim() || !f.crime.trim()) {
      toast.error("الاسم والتهمة مطلوبين");
      return;
    }
    try {
      await api.post("/traitors", f);
      setF({ name: "", role_before: "", crime: "", date: "" });
      toast.success("تمت الإضافة لسجل الخونة");
      load();
    } catch (e) {
      err(e);
    }
  };
  const del = async (id) => {
    try {
      await api.delete(`/traitors/${id}`);
      toast.success("تم الحذف من السجل");
      load();
    } catch (e) {
      err(e);
    }
  };

  return (
    <div>
      <div className="cyber-card rounded-xl p-5 mb-6 grid sm:grid-cols-2 gap-3">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="اسم الخاين" data-testid="input-traitor-name" className="cyber-input rounded-lg px-4 py-2.5 text-right" />
        <input value={f.role_before} onChange={(e) => setF({ ...f, role_before: e.target.value })} placeholder="منصبه قبل الخيانة" className="cyber-input rounded-lg px-4 py-2.5 text-right" />
        <input value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} placeholder="التاريخ" className="cyber-input rounded-lg px-4 py-2.5 text-right" />
        <input value={f.crime} onChange={(e) => setF({ ...f, crime: e.target.value })} placeholder="التهمة" data-testid="input-traitor-crime" className="cyber-input rounded-lg px-4 py-2.5 text-right" />
        <button onClick={add} data-testid="admin-add-traitor-button" className="cyber-btn rounded-lg px-5 py-2.5 font-bold flex items-center justify-center gap-2 sm:col-span-2">
          <Plus size={16} /> إضافة للسجل الأحمر
        </button>
      </div>
      {loading ? <Spinner /> : !list.length ? <Empty text="السجل فاضي" /> : (
        <div className="space-y-4" data-testid="traitors-list">
          {list.map((t) => (
            <div key={t.id} className="cyber-card rounded-xl p-5 border-red-500/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Skull className="text-red-400 mt-1 shrink-0" size={22} />
                <div>
                  <div className="font-display text-lg font-extrabold text-red-300">{t.name}</div>
                  {t.role_before && <div className="text-xs text-slate-500 mt-0.5">{t.role_before}</div>}
                  <div className="text-sm text-slate-300 mt-1">{t.crime}</div>
                  {t.date && <div className="text-xs font-mono text-slate-600 mt-1">{t.date}</div>}
                </div>
              </div>
              <button onClick={() => del(t.id)} className="text-rose-400 hover:text-rose-300 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Stats ---------------- */
const CHART_COLORS = ["#f59e0b", "#22c55e", "#f43f5e", "#FF1E3C", "#C40021", "#FF4D6D"];
function Stats() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setData(r.data)).catch(err);
  }, []);
  if (!data) return <Spinner />;

  const cards = [
    { label: "إجمالي الأعضاء", value: data.members_total, color: "text-red-300" },
    { label: "الخونة في السجل", value: data.traitors_total, color: "text-rose-300" },
    { label: "طلبات قيد المراجعة", value: data.applications_by_status.find((x) => x.status === "قيد المراجعة")?.count || 0, color: "text-amber-300" },
    { label: "طلبات مقبولة", value: data.applications_by_status.find((x) => x.status === "مقبول")?.count || 0, color: "text-emerald-300" },
  ];

  return (
    <div className="space-y-8" data-testid="stats-panel">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="cyber-card rounded-xl p-5">
            <div className={`text-3xl font-extrabold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-card rounded-xl p-5">
          <h3 className="font-bold text-red-300 mb-4">الطلبات حسب الحالة</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.applications_by_status} dataKey="count" nameKey="status" outerRadius={90} label>
                {data.applications_by_status.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#12070a", border: "1px solid #FF1E3C55", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="cyber-card rounded-xl p-5">
          <h3 className="font-bold text-red-300 mb-4">الأعضاء حسب الرتبة</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.members_by_rank}>
              <XAxis dataKey="rank" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "#FF1E3C11" }} contentStyle={{ background: "#12070a", border: "1px solid #FF1E3C55", borderRadius: 8 }} />
              <Bar dataKey="count" fill="#FF1E3C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Logs (audit) ---------------- */
function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/logs").then((r) => setLogs(r.data)).catch(err).finally(() => setLoading(false));
  }, []);
  const labelMap = { approve: "قبول طلب", reject: "رفض طلب", points: "تعديل نقاط" };
  if (loading) return <Spinner />;
  if (!logs.length) return <Empty text="مفيش عمليات مسجلة لسه" />;
  return (
    <div className="space-y-3" data-testid="logs-list">
      {logs.map((l, i) => (
        <div key={l.id || i} className="cyber-card rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ScrollText size={16} className="text-red-400" />
            <span className="text-sm font-bold text-red-200">{labelMap[l.action] || l.action}</span>
            <span className="text-sm text-slate-300">{l.target}</span>
            {typeof l.detail !== "undefined" && l.detail !== "" && (
              <span className="text-xs font-mono text-slate-500">{String(l.detail)}</span>
            )}
          </div>
          {l.at && <span className="text-xs font-mono text-slate-600">{new Date(l.at).toLocaleString("ar-EG")}</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function Field({ label, value, onChange, textarea, mono, testid }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-2">{label}</label>
      {textarea ? (
        <textarea
          data-testid={testid}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`cyber-input w-full rounded-lg px-4 py-2.5 text-right resize-none ${mono ? "font-mono text-left" : ""}`}
        />
      ) : (
        <input
          data-testid={testid}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={`cyber-input w-full rounded-lg px-4 py-2.5 text-right ${mono ? "font-mono text-left" : ""}`}
        />
      )}
    </div>
  );
}

function ListEditor({ title, k, items, setList, add, remove }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-2">{title}</label>
      <div className="space-y-2">
        {(items || []).map((it, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={it} onChange={(e) => setList(k, i, e.target.value)} className="cyber-input rounded-lg px-4 py-2.5 flex-1 text-right" />
            <button onClick={() => remove(k, i)} className="text-rose-400 p-2"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => add(k)} className="mt-2 text-red-400 text-sm font-bold flex items-center gap-1 hover:text-red-300">
        <Plus size={14} /> إضافة سطر
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: ["قيد المراجعة", "text-amber-300 border-amber-500/40 bg-amber-500/10"],
    approved: ["مقبول", "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"],
    rejected: ["مرفوض", "text-rose-300 border-rose-500/40 bg-rose-500/10"],
  };
  const [label, cls] = map[status] || map.pending;
  return <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cls}`}>{label}</span>;
}

function Spinner() {
  return (
    <div className="py-20 grid place-items-center">
      <Loader2 className="animate-spin text-red-400" size={32} />
    </div>
  );
}

function Empty({ text }) {
  return <div className="py-16 text-center text-slate-500 font-mono">{text}</div>;
}
