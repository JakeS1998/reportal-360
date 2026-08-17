import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginRecoveryDialog({ open, onOpenChange }) {
  const [mode, setMode] = useState("password");
  const [step, setStep] = useState("request");
  const [form, setForm] = useState({ username: "", email: "", code: "", password: "", confirm: "", school_code: "", full_name: "", grade_level: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      if (mode === "student") {
        const res = await base44.functions.invoke("accountRecovery", { action: "recover_student_username", ...form });
        setMessage(res.data?.username ? `Your username is ${res.data.username}.` : "We could not confirm an account with those details. Please check them or contact your school.");
      } else if (step === "request") {
        const res = await base44.functions.invoke("accountRecovery", { action: "request_password_reset", ...form });
        setMessage(res.data?.message); setStep("verify");
      } else {
        if (form.password !== form.confirm) { setMessage("Your new passwords do not match."); return; }
        const res = await base44.functions.invoke("accountRecovery", { action: "complete_password_reset", ...form, new_password: form.password });
        setMessage(res.data?.success ? "Password reset. You can now sign in." : res.data?.error);
      }
    } finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Need help signing in?</DialogTitle><DialogDescription>Recover your password or find your username.</DialogDescription></DialogHeader><div className="flex gap-2"><Button type="button" size="sm" variant={mode === "password" ? "default" : "outline"} onClick={() => { setMode("password"); setStep("request"); setMessage(""); }}>Forgot password</Button><Button type="button" size="sm" variant={mode === "student" ? "default" : "outline"} onClick={() => { setMode("student"); setMessage(""); }}>Student username</Button><Button type="button" size="sm" variant={mode === "staff" ? "default" : "outline"} onClick={() => { setMode("staff"); setMessage(""); }}>Staff username</Button></div>{mode === "staff" ? <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">Staff usernames follow the format <strong>schoolcode.fullname</strong>, for example <strong>0101.janesmith</strong>.</p> : <form onSubmit={submit} className="space-y-3">{mode === "student" ? <><Field label="School code" value={form.school_code} onChange={(v) => update("school_code", v)} /><Field label="Student name" value={form.full_name} onChange={(v) => update("full_name", v)} /><Field label="Grade" value={form.grade_level} onChange={(v) => update("grade_level", v)} /></> : step === "request" ? <><Field label="Username" value={form.username} onChange={(v) => update("username", v)} /><Field label="Registered email" type="email" value={form.email} onChange={(v) => update("email", v)} /></> : <><Field label="Recovery code" value={form.code} onChange={(v) => update("code", v)} /><Field label="New password" type="password" value={form.password} onChange={(v) => update("password", v)} /><Field label="Confirm new password" type="password" value={form.confirm} onChange={(v) => update("confirm", v)} /></>} {message && <p className="text-sm text-slate-600">{message}</p>}<Button type="submit" disabled={loading} className="w-full">{loading ? "Please wait..." : step === "verify" && mode === "password" ? "Reset password" : "Continue"}</Button></form>}</DialogContent></Dialog>;
}
function Field({ label, type = "text", value, onChange }) { return <div><Label>{label}</Label><Input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1" /></div>; }