import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordSettings({ user }) {
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [message, setMessage] = useState("");
  const save = async () => { const response = await base44.functions.invoke("resetPassword", { username: user.username, current_password: current, new_password: next }); setMessage(response.data?.success ? "Password updated." : response.data?.error || "Unable to update password."); if (response.data?.success) { setCurrent(""); setNext(""); } };
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Password</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" /><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" /></div>{message && <p className="mt-3 text-sm text-slate-600">{message}</p>}<Button className="mt-4" size="sm" onClick={save} disabled={!current || !next}>Update password</Button></section>;
}