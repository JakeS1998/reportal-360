import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/SectionCard";

export default function LessonPlanReviews() {
  const { user, school } = useSchool();
  const [plans, setPlans] = useState([]);
  const [notes, setNotes] = useState({});
  const load = useCallback(async () => { if (!school?.school_code) return; const res = await base44.functions.invoke("manageLessonPlans", { action: "list", scope: "review", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code }); setPlans(res.data?.plans || []); }, [user, school?.school_code]);
  useEffect(() => { load(); }, [load]);
  const review = async (id, status) => { await base44.functions.invoke("manageLessonPlans", { action: "review", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code, plan_id: id, status, review_notes: notes[id] || "" }); load(); };
  return <SectionCard title="Lesson Plan Reviews">{plans.length ? <div className="space-y-5">{plans.map((plan) => <div key={plan.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-800">{plan.title}</p><p className="mb-3 text-xs text-slate-500">{plan.class_name || "Class"} · Submitted by {plan.owner_name}</p><div className="grid gap-3 text-sm text-slate-700"><p><strong>Objectives:</strong> {plan.objectives || "—"}</p><p><strong>Activities:</strong> {plan.activities || "—"}</p><p><strong>Assessment:</strong> {plan.assessment || "—"}</p></div><Textarea className="mt-3" placeholder="Review notes (optional)" value={notes[plan.id] || ""} onChange={(e) => setNotes({ ...notes, [plan.id]: e.target.value })} /><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => review(plan.id, "approved")}>Approve</Button><Button size="sm" variant="outline" onClick={() => review(plan.id, "revision_requested")}>Request revisions</Button></div></div>)}</div> : <p className="text-sm text-slate-400">No lesson plans are awaiting review.</p>}</SectionCard>;
}