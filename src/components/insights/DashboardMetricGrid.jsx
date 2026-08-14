import React, { useEffect, useMemo, useState } from "react";
import { Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import KpiCard from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const defs = [
  ["math", "Math Proficiency", "#1D4ED8", "Average math score across the student roster."],
  ["reading", "Reading Proficiency", "#7C3AED", "Average reading score across the student roster."],
  ["chronic", "Chronic Absenteeism", "#F59E0B", "Students with attendance below 90%."],
  ["attendance", "Avg Attendance", "#10B981", "Average daily attendance rate across the student roster."],
];

export default function DashboardMetricGrid({ user, isTeacher, canManage, metrics, chronicRate, onNavigate }) {
  const key = `dashboard-metrics-${user?.id || user?.username}`;
  const [allowed, setAllowed] = useState(null);
  const [layout, setLayout] = useState(() => JSON.parse(localStorage.getItem(key) || JSON.stringify(defs.map(([id]) => id))));
  const [saving, setSaving] = useState(false);
  const creds = useMemo(() => ({ caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: user?.sso === true }), [user]);
  useEffect(() => { if (!user?.school_code) return; base44.functions.invoke("manageInsightAccess", { action: "get", school_code: user.school_code, ...creds }).then((r) => setAllowed(r.data?.allowed_teacher_metrics)).catch(() => setAllowed(null)); }, [user?.school_code, creds]);
  const saveLayout = (next) => { setLayout(next); localStorage.setItem(key, JSON.stringify(next)); };
  const toggle = (id) => saveLayout(layout.includes(id) ? layout.filter((item) => item !== id) : [...layout, id]);
  const move = (id, direction) => { const index = layout.indexOf(id); const next = [...layout]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; saveLayout(next); };
  const saveAccess = async () => { setSaving(true); await base44.functions.invoke("manageInsightAccess", { action: "save", school_code: user.school_code, allowed_teacher_metrics: allowed || defs.map(([id]) => id), ...creds }); setSaving(false); };
  const visible = layout.filter((id) => !isTeacher || !allowed || allowed.includes(id));
  return <><div className="flex justify-end -mb-2"><Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 className="w-4 h-4" /> Customize dashboard</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Dashboard settings</DialogTitle></DialogHeader><div className="space-y-3">{defs.map(([id, label]) => <div key={id} className="flex items-center gap-2"><input type="checkbox" checked={layout.includes(id)} onChange={() => toggle(id)} /><span className="flex-1 text-sm">{label}</span><button onClick={() => move(id, -1)}><ChevronUp className="w-4 h-4" /></button><button onClick={() => move(id, 1)}><ChevronDown className="w-4 h-4" /></button>{canManage && <input type="checkbox" checked={(allowed || defs.map(([metric]) => metric)).includes(id)} onChange={() => setAllowed((allowed || defs.map(([metric]) => metric)).includes(id) ? (allowed || []).filter((metric) => metric !== id) : [...(allowed || []), id])} title="Visible to teachers" />}</div>)}</div>{canManage && <Button onClick={saveAccess} disabled={saving} className="mt-5">{saving ? "Saving..." : "Save teacher access"}</Button>}</DialogContent></Dialog></div><div className="grid grid-cols-2 md:grid-cols-4 gap-5">{visible.map((id) => { const [, label, accent, tooltip] = defs.find(([metric]) => metric === id); const props = id === "math" ? { value: metrics.proficiency.math, previous: metrics.prev?.proficiency.math } : id === "reading" ? { value: metrics.proficiency.reading, previous: metrics.prev?.proficiency.reading } : id === "chronic" ? { value: chronicRate, previous: metrics.prev?.chronicRate, suffix: "%", lowerIsBetter: true } : { value: metrics.avgAttendance, previous: metrics.prev?.avgAttendance, suffix: "%" }; return <KpiCard key={id} label={label} accent={accent} year="2026" tooltip={tooltip} onClick={() => onNavigate(id === "math" || id === "reading" ? "/academics" : "/attendance")} {...props} />; })}</div></>;
}