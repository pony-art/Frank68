import { useEffect, useRef, useState } from "react";

export function IntroScreen() {
  const [done, setDone] = useState(
    () =>
      sessionStorage.getItem("frank_intro") === "1" ||
      new URLSearchParams(window.location.search).has("nointro")
  );
  const [fade, setFade] = useState(false);
  const canvasRef = useRef(null);

  const finish = () => {
    setFade(true);
    sessionStorage.setItem("frank_intro", "1");
    setTimeout(() => setDone(true), 700);
  };

  useEffect(() => {
    if (done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "アカサタナ0123456789ﾊﾐﾋﾎﾘﾂﾈﾜｦﾖﾒｽﾈﾁﾗ$#@%&*+=<>".split("");
    const fontSize = 16;
    let columns = Math.floor(canvas.width / fontSize);
    let drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(6,2,3,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = Math.random() > 0.975 ? "#ff5a6e" : "#ff1e3c";
        ctx.fillText(text, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const timer = setTimeout(finish, 3200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) return null;

  return (
    <div
      data-testid="intro-screen"
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-700 ${fade ? "opacity-0" : "opacity-100"}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center px-6">
          <img
            src="/skull-logo.png"
            alt="شعار"
            className="w-28 h-28 mx-auto mb-6 rounded-2xl border border-red-500/40 object-cover shadow-[0_0_50px_rgba(255,30,60,0.6)] animate-pulse"
          />
          <div className="font-display text-2xl sm:text-4xl font-extrabold neon-cyan glitch" data-text="أهلاً بيك في النخبة">
            أهلاً بيك في النخبة
          </div>
          <div className="font-mono text-xs text-red-400/80 mt-3 tracking-[0.4em]">
            FRANK PARTY · ACCESS GRANTED
          </div>
        </div>
      </div>
      <button
        onClick={finish}
        data-testid="intro-skip-button"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-400 border border-white/10 rounded-full px-5 py-2 hover:text-red-300 hover:border-red-500/40 transition-all"
      >
        تخطّي ›
      </button>
    </div>
  );
}
