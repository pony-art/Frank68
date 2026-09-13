import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Loader2, Terminal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("أهلاً بيك يا قايد");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen grid place-items-center px-5">
      <form
        onSubmit={submit}
        data-testid="admin-login-form"
        className="cyber-card rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-2 text-red-400 mb-1 font-mono text-xs uppercase tracking-widest">
          <Terminal size={14} /> نظام الدخول المشفّر
        </div>
        <h1 className="font-display text-3xl font-extrabold neon-cyan mb-8 flex items-center gap-2">
          <Lock size={26} /> دخول القايد
        </h1>

        <label className="block text-sm font-semibold text-slate-200 mb-2">
          الإيميل
        </label>
        <input
          data-testid="input-admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cyber-input w-full rounded-lg px-4 py-3 mb-5 text-right"
          placeholder="bony@frank.party"
        />

        <label className="block text-sm font-semibold text-slate-200 mb-2">
          الباسورد
        </label>
        <input
          data-testid="input-admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cyber-input w-full rounded-lg px-4 py-3 mb-8 text-right"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-admin-login"
          className="cyber-btn rounded-lg w-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
