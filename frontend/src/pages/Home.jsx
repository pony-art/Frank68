import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, Ban, EyeOff, HelpCircle, Users, CheckCircle2, Sparkles, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

const fixedIcons = [Ban, EyeOff, HelpCircle];

function Stat({ value, label, testid }) {
  return (
    <div className="cyber-card rounded-xl px-5 py-4 text-center" data-testid={testid}>
      <div className="text-3xl font-extrabold neon-gradient-text font-display">{value}</div>
      <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest">{label}</div>
    </div>
  );
}

export default function Home() {
  const [content, setContent] = useState(null);
  const [stats, setStats] = useState({ members: 0, approved: 0, total_points: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    api.get("/content").then((r) => setContent(r.data)).catch(() => {});
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const title = content?.party_title || "حزب محبين فرانك الجيزاوي";
  const subtitle = content?.party_subtitle || "";

  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-5 pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
            className="mb-8"
          >
            <div
              className="relative inline-block"
              style={{ perspective: "800px" }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                setTilt({ x: -py * 22, y: px * 22 });
              }}
              onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            >
              <div className="absolute inset-0 blur-2xl bg-red-500/30 rounded-full" />
              <img
                src="/skull-logo-text.png"
                alt="شعار حزب محبين فرانك الجيزاوي"
                className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-2xl border border-red-500/30 object-cover shadow-[0_0_40px_rgba(255,30,60,0.35)]"
                style={{
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: "transform 0.12s ease-out",
                }}
                data-testid="hero-logo"
              />
            </div>
          </motion.div>
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-red-400 border border-red-500/30 rounded-full px-4 py-1.5">
            <Sparkles size={14} /> نظام النخبة السرّي
          </span>
          <h1
            className="glitch mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight neon-cyan"
            data-text={title}
          >
            {title}
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/apply"
              data-testid="hero-cta-apply-button"
              className="cyber-btn rounded-lg px-7 py-3 font-bold text-sm flex items-center gap-2"
            >
              قدّم طلب انضمام الآن <ArrowLeft size={16} />
            </Link>
            <Link
              to="/rules"
              data-testid="hero-cta-rules-button"
              className="cyber-btn-pink cyber-btn rounded-lg px-7 py-3 font-bold text-sm"
            >
              استكشف قوانين الحزب
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-14 grid grid-cols-3 gap-4 max-w-xl"
        >
          <Stat value={stats.members} label="عضو نشط" testid="stat-members" />
          <Stat value={stats.approved} label="طلب مقبول" testid="stat-approved" />
          <Stat value={stats.total_points} label="مجموع النقاط" testid="stat-points" />
        </motion.div>
      </section>

      {/* Fixed entry rules */}
      <section className="max-w-7xl mx-auto px-5 py-16">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="text-rose-500" />
          <span className="text-xs font-mono uppercase tracking-widest text-rose-400">
            تحذير نظام فرانك
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-8">
          قوانين الدخول الثابتة <span className="text-rose-500">(الخطوط الحمراء)</span>
        </h2>

        <div
          className="grid md:grid-cols-3 gap-5"
          data-testid="fixed-entry-rules-container"
        >
          {(content?.fixed_rules || []).map((rule, i) => {
            const Icon = fixedIcons[i % fixedIcons.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="cyber-card rounded-xl p-6"
              >
                <div className="w-11 h-11 grid place-items-center rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
                  <Icon size={20} />
                </div>
                <div className="text-xs font-mono text-rose-400 mb-2">
                  القانون {["الأول", "الثاني", "الثالث"][i] || i + 1}
                </div>
                <p className="text-slate-200 leading-relaxed">{rule}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section className="max-w-7xl mx-auto px-5 py-16">
        <div className="cyber-card rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-rose-600/20 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-4 text-red-400">
            <Users size={18} />
            <span className="font-mono text-xs uppercase tracking-widest">عن الحزب</span>
          </div>
          <p className="text-lg leading-loose text-slate-200 max-w-3xl relative">
            {content?.about_text}
          </p>
          <div className="mt-8 flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 size={16} /> الولاء أولاً، والعزة دائماً.
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 mt-10 py-8 text-center text-xs text-slate-500 font-mono">
        © حزب محبين فرانك الجيزاوي — كل الحقوق تحت راية القائد بوني
      </footer>
    </div>
  );
}
