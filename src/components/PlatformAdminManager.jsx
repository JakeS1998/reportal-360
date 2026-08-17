import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import { ShieldCheck } from "lucide-react";
import PlatformAdminRow from "@/components/PlatformAdminRow";

export default function PlatformAdminManager({ callerCreds }) {
  const [admins, setAdmins] = useState([]); const [fullName, setFullName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const load = async () => { const res = await base44.functions.invoke("manageSchoolStaff", { action: "list_platform_admins", ...callerCreds }); if (res.data?.success) setAdmins(res.data.admins); };
  useEffect(() => { load(); }, []);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); const res = await base44.functions.invoke("manageSchoolStaff", { action: "create_platform_admin", ...callerCreds, full_name: fullName, username, password }); if (res.data?.success) { setFullName(""); setUsername(""); setPassword(""); load(); } else setError(res.data?.error || "Unable to create administrator"); setSaving(false); };
  return <SectionCard title="Platform Administrators" subtitle="Create password-only administrator accounts" icon={ShieldCheck}><form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><div><Label>Full name</Label><Input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1" /></div><div><Label>Username</Label><Input required pattern="adm\.[a-z]+" title="Use the format adm.name" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="adm.name" className="mt-1" /></div><div><Label>Temporary password</Label><Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" /></div><div className="flex items-end"><Button disabled={saving} className="w-full">{saving ? "Creating..." : "Add administrator"}</Button></div></form>{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}<div className="mt-5 space-y-2">{admins.map((admin) => <PlatformAdminRow key={admin.id} admin={admin} callerCreds={callerCreds} onUpdated={load} />)}</div></SectionCard>;
}