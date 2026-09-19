"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "../../lib/api-admin";
import { Waves, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const res = await adminLogin({ username, password });
    setLoading(false);

    if (res.success && res.data?.token) {
      localStorage.setItem("swimming_admin_token", res.data.token);
      if (res.data.user) {
        localStorage.setItem("swimming_admin_user", JSON.stringify(res.data.user));
      }
      router.push("/dashboard");
    } else {
      setErrorMsg(res.message || "Username atau password salah");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-sky-500/20 mb-4">
            <Waves className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Login Admin CMS</h1>
          <p className="text-xs font-bold text-sky-600 mt-1">Kejuaraan Renang Time Trial 2025</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-sky-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-sky-500 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
          </button>
        </form>

        <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-[11px] text-slate-600 text-center font-medium">
          Default Credential: <code className="text-sky-700 font-bold font-mono">admin</code> / <code className="text-sky-700 font-bold font-mono">admin123</code>
        </div>
      </div>
    </div>
  );
}
