import { motion } from "framer-motion";
import {
  Flag, Swords, Skull, Ghost, Crown, ShieldCheck, ScrollText, Handshake,
} from "lucide-react";

const chapters = [
  {
    icon: Flag,
    tag: "الفصل الأول",
    title: "البداية والتأسيس",
    body:
      "في الزمن الأول، اتأسس الحزب على إيد تلاتة مؤسسين: محمد صداح بقى الرئيس، بوني بقى وزير الوزراء، وويسكي بقى نائب الرئيس. كانوا إيد واحدة، والحزب بيكبر يوم بعد يوم تحت رايتهم.",
  },
  {
    icon: Swords,
    tag: "الفصل الثاني",
    title: "الخيانة الكبرى",
    body:
      "لكن الطمع دخل قلب صداح. باع المبادئ، خان العهد، وهرب في نص الليل وسايب الحزب في أصعب أوقاته. اسمه اتحوّل من رئيس لـ… خاين.",
  },
  {
    icon: Handshake,
    tag: "الفصل الثالث",
    title: "انسحاب ويسكي",
    body:
      "بعد هروب الرئيس، ويسكي — نائب الرئيس وواحد من المؤسسين — قرر ينسحب من الحزب. لكنه فضل صديق للحزب من بعيد، محتفظ باحترامه ومكانته كأحد اللي بنوا الأساس.",
  },
  {
    icon: Ghost,
    tag: "الفصل الرابع",
    title: "الغياب والاعتقاد بموته",
    body:
      "بعد الهروب اختفى صداح تماماً. الكل افتكر إنه مات وطويت صفحته. الحزب حزن، لكن فضل صامد مستني بطل يلمّ الشمل.",
  },
  {
    icon: Skull,
    tag: "الفصل الخامس",
    title: "طلع عايش… وخان تاني",
    body:
      "الصدمة إنه طلع عايش! رجع من تاني، لكن مش نادم — رجع مجرم حرب بيخون الحزب من ورا ضهره. دلوقتي اسمه محفور في سجل الخونة: مطلوب حي أو ميت.",
  },
  {
    icon: ShieldCheck,
    tag: "الفصل السادس",
    title: "البطل بوني يُنقذ الحزب",
    body:
      "في أحلك لحظة، وقف بوني. جمّع المخلصين، طرد الخيانة، ووحّد الصفوف من تاني. أنقذ الحزب من الضياع وأعاده أقوى ما كان.",
  },
  {
    icon: Crown,
    tag: "الفصل الأخير",
    title: "القائد بوني… الرئيس",
    body:
      "بجدارة واستحقاق، بقى بوني الرئيس والقائد. ومن يومها والحزب ماشي على مبدأ واحد: الولاء أولاً، والخيانة مصيرها السجل الأحمر.",
  },
];

export default function Story() {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-5 pt-32 pb-24">
      {/* header */}
      <div className="flex items-center gap-3 text-red-400 mb-2">
        <ScrollText size={20} />
        <span className="font-mono text-xs uppercase tracking-widest">
          الأرشيف السرّي للحزب
        </span>
      </div>
      <h1 className="glitch font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold neon-cyan mb-4" data-text="حكاية الحزب">
        حكاية الحزب
      </h1>
      <p className="text-slate-300 leading-relaxed max-w-2xl mb-14">
        قصة خيانة وبطولة… إزاي خان محمد صداح الحزب وهرب، وإزاي رجع البطل بوني وأنقذ
        كل حاجة وبقى الرئيس.
      </p>

      {/* wanted banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-16 rounded-2xl border border-red-500/40 bg-red-500/5 p-5 sm:p-6"
        data-testid="wanted-banner"
      >
        <div className="font-mono text-xs text-red-400 tracking-widest mb-1">
          WANTED · مطلوب حي أو ميت
        </div>
        <div className="font-display text-2xl font-extrabold text-red-300">
          محمد صداح
        </div>
        <div className="text-sm text-slate-400 mt-1">
          التهمة: خيانة الحزب والهروب · مجرم حرب · اسمه في السجل الأحمر للأبد.
        </div>
      </motion.div>

      {/* timeline */}
      <div className="relative">
        <div className="absolute right-5 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/60 via-red-500/20 to-transparent" />
        <div className="space-y-10">
          {chapters.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
                className="relative pr-16"
                data-testid={`story-chapter-${i}`}
              >
                <span className="absolute right-0 top-1 grid place-items-center w-10 h-10 rounded-full border border-red-500/50 bg-[#17070a] text-red-400 shadow-[0_0_18px_rgba(255,30,60,0.4)]">
                  <Icon size={18} />
                </span>
                <div className="cyber-card rounded-xl p-6">
                  <div className="font-mono text-xs text-red-400 tracking-widest mb-2">
                    {c.tag}
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-100 mb-3">
                    {c.title}
                  </h2>
                  <p className="text-slate-300 leading-loose">{c.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* closing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 text-center cyber-card rounded-2xl p-8"
      >
        <Crown className="mx-auto text-red-400 mb-3" size={40} />
        <p className="font-display text-xl sm:text-2xl font-bold neon-cyan">
          تحيا راية القائد بوني — والمجد للحزب
        </p>
        <p className="text-slate-400 mt-2 text-sm">
          الولاء أولاً، والخيانة لا تُنسى ولا تُغفر.
        </p>
      </motion.div>
    </div>
  );
}
