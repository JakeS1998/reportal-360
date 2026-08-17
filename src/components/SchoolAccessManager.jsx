import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { completeLogin } from "@/lib/authFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import SchoolAccessProgress from "@/components/SchoolAccessProgress";
import { Building2 } from "lucide-react";

export default function SchoolAccessManager({ callerCreds, adminUser }) {
  const [schools, setSchools] = useState([]); const [query, setQuery] = useState(""); const [schoolKey, setSchoolKey] = useState(""); const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [progressStage, setProgressStage] = useState("");
  useEffect(() => { base44.functions.invoke("manageSchoolStaff", { action: "list_school_access_options", ...callerCreds }).then((res) => setSchools(res.data?.schools || [])); }, []);
  const matches = schools.filter((school) => `${school.school_name} ${school.school_key}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); setProgressStage("recording"); const res = await base44.functions.invoke("manageSchoolStaff", { action: "access_school", ...callerCreds, school_key: schoolKey, reason }); if (!res.data?.success) { setError(res.data?.error || "Unable to access this school"); setSaving(false); setProgressStage(""); return; } const school = res.data.school; setProgressStage("preparing"); await completeLogin({ ...adminUser, role: "manager", administrator_access: true, school_code: school.school_code, system_code: school.system_code, school_name: school.school_name, system_name: school.system_name || "" }); setProgressStage("opening"); window.location.assign("/overview"); };
  return <SectionCard title="Access a School" subtitle="Open a school workspace as a manager; every access is recorded" icon={Building2}><form onSubmit={submit} className="space-y-3"><div><Label>Search school</Label><Input value={query} onChange={(event) => { setQuery(event.target.value); setSchoolKey(""); }} placeholder="School name or code" className="mt-1" />{query && <div className="mt-1 rounded-lg border border-slate-200 bg-white">{matches.map((school) => <button type="button" key={school.id} onClick={() => { setSchoolKey(school.school_key); setQuery(`${school.school_name} (${school.school_key})`); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{school.school_name} <span className="text-slate-400">· {school.school_key}</span></button>)}</div>}</div><div><Label>Reason for access</Label><Textarea required minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why you need to access this school." className="mt-1" /></div>{saving && <SchoolAccessProgress stage={progressStage} />}{error && <p className="text-sm text-rose-600">{error}</p>}<Button disabled={!schoolKey || saving}>{saving ? "Opening..." : "Access as manager"}</Button></form></SectionCard>;
}