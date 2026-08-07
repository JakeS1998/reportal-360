import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { completeLogin } from "@/lib/authFlow";
import { AlertCircle, Loader2 } from "lucide-react";

export default function SsoCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = sessionStorage.getItem("ssoState");

    if (!code) {
      setError("No authorization code received.");
      return;
    }

    if (!savedState || state !== savedState) {
      setError("Security validation failed. Please try signing in again.");
      return;
    }

    sessionStorage.removeItem("ssoState");
    const provider = sessionStorage.getItem("ssoProvider") || "microsoft";
    sessionStorage.removeItem("ssoProvider");
    const redirectUri = window.location.origin + "/sso-callback";
    const fnName = provider === "google" ? "googleSSO" : "entraSSO";
    const providerLabel = provider === "google" ? "Google" : "Microsoft";

    base44.functions
      .invoke(fnName, { code, redirect_uri: redirectUri })
      .then((res) => {
        if (!res.data?.success) {
          setError(res.data?.error || `${providerLabel} sign-in failed.`);
          return;
        }
        const user = res.data.user;

        if (user.role === "admin") {
          localStorage.setItem("userSession", JSON.stringify({ user }));
          navigate("/admin", { replace: true });
          return;
        }

        if (!user.school_code) {
          setError("Your account has been created but no school has been assigned yet. Please contact your administrator to complete setup.");
          return;
        }

        completeLogin(user).then(() => {
          navigate(user.role === "student" ? "/my-student" : "/overview", { replace: true });
        });
      })
      .catch((err) => {
        const real = err?.response?.data?.error || err?.data?.error || err?.message;
        setError(real || `Unable to complete ${providerLabel} sign-in. Please try again.`);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Sign-in Failed</h1>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button onClick={() => navigate("/login")} className="text-sm font-medium text-slate-900 underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Completing sign-in...</p>
      </div>
    </div>
  );
}