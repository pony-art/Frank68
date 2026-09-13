import { createContext, useContext, useEffect, useRef, useState } from "react";

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [muted, setMuted] = useState(() => localStorage.getItem("frank_muted") === "1");
  const ctxRef = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    localStorage.setItem("frank_muted", muted ? "1" : "0");
  }, [muted]);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  };

  const tick = (freq = 440, dur = 0.05, gain = 0.04) => {
    if (mutedRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };

  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest("button, a, [role='button']");
      if (el) tick(520, 0.05, 0.05);
    };
    const onOver = (e) => {
      const el = e.target.closest("button, a");
      if (el) tick(880, 0.03, 0.02);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("mouseover", onOver);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <SoundContext.Provider value={{ muted, setMuted, toggle: () => setMuted((m) => !m) }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
