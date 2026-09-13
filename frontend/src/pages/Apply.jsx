import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";

export default function Apply() {
  const [questions, setQuestions] = useState([]);
  const [discord, setDiscord] = useState("");
  const [answers, setAnswers] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/questions").then((r) => setQuestions(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!discord.trim()) return toast.error("اكتب اسم الديسكورد");
    if (!agreed) return toast.error("لازم توافق على قوانين الحزب");
    setLoading(true);
    try {
      await api.post("/applications", {
        discord_username: discord.trim(),
        answers,
        agreed_rules: agreed,
      });
      setDone(true);
      toast.success("تم إرسال طلبك للقائد — استنى القرار");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-40 pb-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="cyber-card rounded-2xl p-12"
        >
          <CheckCircle2 className="mx-auto text-emerald-400 mb-5" size={56} />
          <h1 className="font-display text-3xl font-bold neon-cyan mb-3">
            تم استلام طلبك
          </h1>
          <p className="text-slate-300 leading-relaxed">
            القائد بوني هيراجع طلبك قريباً. لو اتقبلت، البوت هيديك رتبتك ويرحّب بيك.
            فرانك يراقب...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-2xl mx-auto px-5 pt-32 pb-20">
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold neon-cyan mb-3">
        استمارة التقديم
      </h1>
      <p className="text-slate-400 mb-10 leading-relaxed">
        أدخل معرف الديسكورد وأجب عن الأسئلة بصدق. الكذب = رفض فوري.
      </p>

      <form
        onSubmit={submit}
        data-testid="join-application-form"
        className="cyber-card rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <label className="block text-sm font-semibold text-red-300 mb-2">
            اسم حساب الديسكورد <span className="text-rose-500">*</span>
          </label>
          <input
            data-testid="input-discord-username"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="مثال: bony#0001 أو bony"
            className="cyber-input w-full rounded-lg px-4 py-3 text-right"
          />
        </div>

        {questions.map((q, i) => (
          <div key={q.id}>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              {q.text} {q.required && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              data-testid={`input-answer-${i}`}
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              rows={3}
              className="cyber-input w-full rounded-lg px-4 py-3 text-right resize-none"
            />
          </div>
        ))}

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="checkbox-agree-rules"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 accent-red-400"
          />
          <span className="text-sm text-slate-300 leading-relaxed">
            أقرّ بالالتزام بكل قوانين الحزب والخطوط الحمراء (ممنوع الكذب، ممنوع
            السيمب، وممنوع تسأل مين فرانك).
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-application-button"
          className="cyber-btn rounded-lg w-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              أرسل الطلب للقائد <Send size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
