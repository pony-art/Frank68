import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/", label: "الرئيسية", id: "nav-link-home" },
  { to: "/rules", label: "قوانين الحزب", id: "nav-link-rules" },
  { to: "/story", label: "الحكاية", id: "nav-link-story" },
  { to: "/apply", label: "تقديم طلب", id: "nav-link-apply" },
];

export function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [botConnected, setBotConnected] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .get("/bot-status")
      .then((r) => setBotConnected(r.data.connected))
      .catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-red-500/10 bg-[#06070b]/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
        <Link
          to="/"
          data-testid="nav-brand-logo"
          className="flex items-center gap-2 group"
        >
          <span className="grid place-items-center w-10 h-10 rounded-md border border-red-500/40 bg-red-500/5 overflow-hidden group-hover:shadow-[0_0_18px_rgba(255,30,60,0.5)] transition-all">
            <img
              src="/skull-logo.png"
              alt="شعار حزب فرانك"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="font-display font-extrabold text-lg neon-cyan">
            حزب فرانك
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={l.id}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                pathname === l.to
                  ? "text-red-300 bg-red-500/10"
                  : "text-slate-400 hover:text-red-300 hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to={user ? "/admin" : "/login"}
            data-testid="nav-link-admin"
            className="px-4 py-2 rounded-md text-sm font-semibold text-rose-300 hover:bg-rose-500/10 transition-all"
          >
            {user ? "لوحة القائد" : "دخول القائد"}
          </Link>
          <span
            data-testid="nav-bot-status-badge"
            className="ml-2 flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border border-white/10"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                botConnected ? "bg-emerald-400" : "bg-rose-500"
              } ${botConnected ? "" : "flicker"}`}
            />
            {botConnected ? "البوت متصل" : "البوت غير متصل"}
          </span>
        </div>

        <button
          className="md:hidden text-red-300"
          onClick={() => setOpen((v) => !v)}
          data-testid="nav-mobile-toggle"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-red-500/10 px-5 py-3 flex flex-col gap-1 bg-[#06070b]/95">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-md text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to={user ? "/admin" : "/login"}
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-md text-sm font-semibold text-rose-300"
          >
            {user ? "لوحة القائد" : "دخول القائد"}
          </Link>
        </div>
      )}
    </header>
  );
}
