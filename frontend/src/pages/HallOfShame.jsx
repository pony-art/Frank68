import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Skull, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

export default function HallOfShame() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/traitors").then((r) => setList(r.data)).catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 pt-28 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Skull className="text-red-400" size={30} />
          <span className="font-mono text-xs uppercase tracking-[0.35em] text-red-400">
            Hall of Shame · السجل الأحمر
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold neon-cyan glitch mb-4" data-text="سجل الخونة">
          سجل الخونة
        </h1>
        <p className="text-slate-300 leading-relaxed max-w-2xl mb-12">
          الأسماء اللي خانت العهد وباعت الحزب. اسمهم محفور هنا للأبد — عبرة لكل خاين.
        </p>
      </motion.div>

      {list.length === 0 ? (
        <div className="py-20 text-center text-slate-500 font-mono">السجل نضيف… لسه.</div>
      ) : (
        <div className="space-y-6" data-testid="shame-list">
          {list.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="cyber-card rounded-2xl p-6 border border-red-500/40"
              data-testid={`shame-card-${t.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="grid place-items-center w-14 h-14 rounded-xl border border-red-500/40 bg-red-500/10 shrink-0">
                  <Skull className="text-red-400" size={26} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[11px] text-red-400 tracking-widest mb-1 flex items-center gap-1">
                    <ShieldAlert size={13} /> WANTED · مطلوب حي أو ميت
                  </div>
                  <div className="font-display text-2xl font-extrabold text-red-300">{t.name}</div>
                  {t.role_before && (
                    <div className="text-sm text-slate-500 mt-0.5">{t.role_before}</div>
                  )}
                  <div className="text-sm text-slate-200 mt-2 leading-relaxed">
                    <span className="text-rose-400 font-bold">التهمة: </span>
                    {t.crime}
                  </div>
                  {t.date && (
                    <div className="text-xs font-mono text-slate-600 mt-2">{t.date}</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
