import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import KpiCard from "@/components/KpiCard";
import DashboardEditor from "@/components/insights/DashboardEditor";

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
  const saveAccess = async () => { setSaving(true); await base44.functions.invoke("manageInsightAccess", { action: "save", school_code: user.school_code, allowed_teacher_metrics: allowed || defs.map(([id]) => id), ...creds }); setSaving(false); };
  const visible = layout.filter((id) => !isTeacher || !allowed || allowed.includes(id));
  return <><div className="flex justify-end -mt-12 mb-6 relative z-10"><DashboardEditor defs={defs} layout={layout} onLayoutChange={saveLayout} canManage={canManage} allowed={allowed} onAllowedChange={setAllowed} onSaveAccess={saveAccess} saving={saving} /></div><div className="grid grid-cols-2 md:grid-cols-4 gap-5">{visible.map((id) => { const [, label, accent, tooltip] = defs.find(([metric]) => metric === id); const props = id === "math" ? { value: metrics.proficiency.math, previous: metrics.prev?.proficiency.math } : id === "reading" ? { value: metrics.proficiency.reading, previous: metrics.prev?.proficiency.reading } : id === "chronic" ? { value: chronicRate, previous: metrics.prev?.chronicRate, suffix: "%", lowerIsBetter: true } : { value: metrics.avgAttendance, previous: metrics.prev?.avgAttendance, suffix: "%" }; return <KpiCard key={id} label={label} accent={accent} year="2026" tooltip={tooltip} onClick={() => onNavigate(id === "math" || id === "reading" ? "/academics" : "/attendance")} {...props} />; })}</div></>;
}