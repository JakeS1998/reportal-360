import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";
import { Copy, Library, Pencil } from "lucide-react";
import LessonPlanDialog from "@/components/lesson-plans/LessonPlanDialog";

export default function LessonPlans() {
  const { user, school } = useSchool();
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = useCallback(async () => { if (!school?.school_code) return; const res = await base44.functions.invoke("manageLessonPlans", { action: "list", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code }); setPlans(res.data?.plans || []); }, [user, school?.school_code]);
  useEffect(() => { load(); }, [load]);
  const copyAsDraft = async (plan) => { await base44.functions.invoke("manageLessonPlans", { action: "clone", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code, plan_id: plan.id }); load(); };
  const shared = plans.filter((plan) => plan.shared && plan.owner_id !== user?.id);
  const mine = plans.filter((plan) => plan.owner_id === user?.id);
  const PlanList = ({ title, rows, empty }) => <SectionCard title={title} icon={Library}>{rows.length ? <div className="space-y-3">{rows.map((plan) => <div key={plan.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold text-slate-800">{plan.title}</p><p className="text-xs text-slate-500">{plan.class_name || "Class"} · {plan.owner_name} · {plan.status.replaceAll("_", " ")}</p></div>{title === "Shared lesson plans" ? <Button size="sm" variant="outline" onClick={() => copyAsDraft(plan)}><Copy className="mr-1 w-4 h-4" />Use as draft</Button> : <Button size="sm" variant="outline" onClick={() => setEditing(plan)}><Pencil className="mr-1 w-4 h-4" />Edit</Button>}</div>)}</div> : <p className="text-sm text-slate-400">{empty}</p>}</SectionCard>;
  return <div className="space-y-6"><PlanList title="My lesson plans" rows={mine} empty="Create a lesson plan from a class or schedule slot." /><PlanList title="Shared lesson plans" rows={shared} empty="No teachers have shared lesson plans yet." /><LessonPlanDialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }} context={editing} onSaved={load} /></div>;
}