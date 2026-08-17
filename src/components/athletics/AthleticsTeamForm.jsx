import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AthleticsTeamForm({ schoolCode, user, onCreated }) {
  const [form, setForm] = useState({ name: "", sport: "", season: "", level: "Varsity" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); const team = await base44.entities.AthleticsTeam.create({ ...form, school_code: schoolCode, coach_id: user?.id || user?.teacher_id || "", coach_name: user?.full_name || user?.username || "Coach" }); setForm({ name: "", sport: "", season: "", level: "Varsity" }); setSaving(false); onCreated(team); };
  return <form onSubmit={submit} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-5"><Input required placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input required placeholder="Sport" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} /><Input placeholder="Season (e.g. Fall 2026)" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} /><select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="h-9 rounded-md border border-input bg-white px-3 text-sm"><option>Varsity</option><option>Junior Varsity</option><option>Middle School</option><option>Elementary</option><option>Club</option></select><Button disabled={saving}>{saving ? "Creating..." : "Create team"}</Button></form>;
}