import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, KeyRound } from "lucide-react";
import { completeLogin, setTempSession } from "@/lib/authFlow";

export default function SelectSchool() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (!res.data?.success) {
        setError(res.data?.error || "Invalid credentials");
        return;
      }
      const user = res.data.user;

      // Admin goes to admin panel
      if (user.role === "admin") {
        localStorage.setItem("userSession", JSON.stringify({ user }));
        navigate("/admin", { replace: true });
        return;
      }

      // First-login force reset
      if (user.password_reset_required) {
        setTempSession({ username, password });
        navigate("/reset-password", { replace: true });
        return;
      }

      // Normal login — fetch school data and enter dashboard
      await completeLogin(user);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <img
        src="https://images.unsplash.com/photo-1440582096070-fa5961d9d682?auto=format&fit=crop&w=1920&q=80"
        alt="Birmingham, Alabama cityscape by the water"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/70" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ReportAL 360</h1>
          <p className="text-sm text-slate-200 mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur p-6 rounded-2xl border border-white/20 space-y-4 shadow-2xl">
          <div>
            <Label className="text-sm font-medium text-slate-700">Username</Label>
            <div className="relative mt-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 0101.jsavage"
                className="pl-9"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Format: schoolcode.name</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Password</Label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
          </form>

          <div className="text-center mt-4">
            <Link to="/admin-login" className="text-xs text-slate-300 hover:text-white transition-colors">
              Admin login
            </Link>
          </div>
        </div>
    </div>
  );
}