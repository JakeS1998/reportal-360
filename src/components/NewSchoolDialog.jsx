import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function NewSchoolDialog({ callerCreds, onCreated }) {
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ school_name: "", system_code: "", school_code: "" }); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const change = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); const res = await base44.functions.invoke("manageSchoolStaff", { action: "create_school_directory", ...callerCreds, ...form }); if (res.data?.success) { setOpen(false); setForm({ school_name: "", system_code: "", school_code: "" }); onCreated?.(); } else setError(res.data?.error || "Unable to create school"); setSaving(false); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" />Create new school</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create new school</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-500">Use the ALSDE system and school codes when available. A future daily refresh will match this school to its ALSDE record.</p><div><Label>School name</Label><Input required value={form.school_name} onChange={change("school_name")} className="mt-1" /></div><div className="grid grid-cols-2 gap-3"><div><Label>System code</Label><Input required value={form.system_code} onChange={change("system_code")} className="mt-1" /></div><div><Label>School code</Label><Input required value={form.school_code} onChange={change("school_code")} className="mt-1" /></div></div>{error && <p className="text-sm text-rose-600">{error}</p>}<Button disabled={saving}>{saving ? "Creating..." : "Create school"}</Button></form></DialogContent></Dialog>;
}