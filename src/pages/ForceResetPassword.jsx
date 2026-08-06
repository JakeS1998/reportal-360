import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, ShieldCheck, CheckCircle2, Circle } from "lucide-react";
import { getTempSession, clearTempSession } from "@/lib/authFlow";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0-9)", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character (!@#$%^&*)", test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pw) },
];

function validatePassword(password) {
  return PASSWORD_REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.label);
}

export default function ForceResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempSession, setTempSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ts = getTempSession();
    if (!ts) {
      navigate("/", { replace: true });
      return;
    }
    setTempSession(ts);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const pwErrors = validatePassword(newPassword);
    if (pwErrors.length > 0) {
      setError("Password requirements not met: " + pwErrors.join(", "));
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Reset the password
      const resetRes = await base44.functions.invoke("resetPassword", {
        username: tempSession.username,
        current_password: tempSession.password,
        new_password: newPassword,
      });
      if (!resetRes.data?.success) {
        setError(resetRes.data?.error || "Unable to reset password");
        return;
      }

      // Now log in with the new password to get the full user object
      const loginRes = await base44.functions.invoke("loginUser", {
        username: tempSession.username,
        password: newPassword,
      });
      if (!loginRes.data?.success) {
        setError("Password reset but login failed. Please sign in manually.");
        clearTempSession();
        navigate("/", { replace: true });
        return;
      }

      clearTempSession();
      // Store minimal session — SchoolContext will fetch full school data on mount
      const minimalSession = {
        user: loginRes.data.user,
        school: {
          system_code: loginRes.data.user.system_code,
          school_code: loginRes.data.user.school_code,
        },
        systemSchools: [],
      };
      localStorage.setItem("userSession", JSON.stringify(minimalSession));
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!tempSession) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set Your Password</h1>
          <p className="text-sm text-slate-500 mt-1">First login — please choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">New Password</Label>
            <Input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-1"
            />
            <div className="mt-2.5 space-y-1">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(newPassword);
                return (
                  <div key={req.label} className="flex items-center gap-1.5 text-xs">
                    {met ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <Circle className="w-3 h-3 text-slate-300 shrink-0" />}
                    <span className={met ? "text-emerald-600" : "text-slate-400"}>{req.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Confirm Password</Label>
            <Input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Saving..." : "Set Password & Continue"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </div>
    </div>
  );
}