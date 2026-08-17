import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlatformAdminRow({ admin, callerCreds, onUpdated }) {
  const [email, setEmail] = useState(admin.email?.endsWith("@local.reportal360") ? "" : admin.email || ""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const save = async () => { setSaving(true); setError(""); const res = await base44.functions.invoke("manageSchoolStaff", { action: "update_platform_admin", ...callerCreds, user_id: admin.id, email }); if (res.data?.success) onUpdated(); else setError(res.data?.error || "Unable to save email"); setSaving(false); };
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><div className="flex items-center gap-2 text-sm text-slate-700"><strong>{admin.full_name}</strong><span className="text-slate-400">{admin.username}</span></div><div className="mt-2 flex gap-2"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="SSO email address" /><Button type="button" size="sm" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save email"}</Button></div>{error && <p className="mt-1 text-xs text-rose-600">{error}</p>}</div>;
}