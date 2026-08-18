import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import { Building2 } from "lucide-react";

export default function SystemUserManager({ callerCreds }) {
  const [systems, setSystems] = useState([]);
  const [form, setForm] = useState({ fullName: "", email: "", username: "", password: "", systemCode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    base44.functions.invoke("masterListApi", { resource: "systems", ...callerCreds })
      .then((res) => setSystems(res.data?.systems || []));
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectedSystem = systems.find((system) => system.system_code === form.systemCode);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreated(null);
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "create",
        ...callerCreds,
        full_name: form.fullName,
        email: form.email,
        username: form.username.toLowerCase(),
        password: form.password,
        role: "commissioner",
        school_code: "0000",
        system_code: form.systemCode,
        school_name: "All Schools",
        system_name: selectedSystem?.district_name || "",
      });
      if (!res.data?.success) {
        setError(res.data?.error || "Unable to create system user");
        return;
      }
      setCreated({ username: res.data.user.username, password: res.data.temp_password });
      setForm({ fullName: "", email: "", username: "", password: "", systemCode: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create system user");
    } finally {
      setSaving(false);
    }
  };

  return <SectionCard title="System Users" subtitle="Give a district user access to every school in one system" icon={Building2}>
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div><Label>System</Label><select required value={form.systemCode} onChange={(event) => update("systemCode", event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Select a system…</option>{systems.map((system) => <option key={system.system_code} value={system.system_code}>{system.system_code} · {system.district_name}</option>)}</select></div>
      <div><Label>Full name</Label><Input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-1" /></div>
      <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-1" /></div>
      <div><Label>Username</Label><Input required value={form.username} onChange={(event) => update("username", event.target.value)} placeholder="022.name" className="mt-1" /></div>
      <div><Label>Temporary password</Label><Input required type="password" value={form.password} onChange={(event) => update("password", event.target.value)} className="mt-1" /></div>
      <div className="md:col-span-2 xl:col-span-5 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">System users can view and switch between all schools in their selected system.</p><Button disabled={saving}>{saving ? "Creating..." : "Add system user"}</Button></div>
    </form>
    {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    {created && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">System user created — username: <strong>{created.username}</strong> · temporary password: <strong>{created.password}</strong></div>}
  </SectionCard>;
}