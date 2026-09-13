import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

export default function Rules() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get("/content").then((r) => setContent(r.data)).catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 pt-32 pb-20">
      <div className="flex items-center gap-3 text-red-400 mb-2">
        <ScrollText size={20} />
        <span className="font-mono text-xs uppercase tracking-widest">دستور الحزب</span>
      </div>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold neon-cyan mb-10">
        قوانين الحزب
      </h1>

      {/* Party rules */}
      <div className="space-y-4">
        {(content?.party_rules || []).map((rule, i) => (
          <motion.div
            key={rule}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="cyber-card rounded-xl p-5 flex gap-4 items-start"
            data-testid={`party-rule-${i}`}
          >
            <span className="font-display font-extrabold text-2xl neon-gradient-text min-w-[2rem]">
              {i + 1}
            </span>
            <p className="text-slate-200 leading-relaxed pt-1">{rule}</p>
          </motion.div>
        ))}
      </div>

      {/* Fixed red lines */}
      <div className="mt-14">
        <div className="flex items-center gap-3 text-rose-400 mb-5">
          <ShieldAlert size={20} />
          <h2 className="font-display text-2xl font-bold">الخطوط الحمراء (لا تُكسر أبداً)</h2>
        </div>
        <div className="space-y-3">
          {(content?.fixed_rules || []).map((rule, i) => (
            <div
              key={rule}
              className="rounded-xl p-5 border border-rose-500/30 bg-rose-500/5 text-rose-100 leading-relaxed"
              data-testid={`fixed-rule-${i}`}
            >
              {rule}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
