import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyPlan = { title: "", objectives: "", activities: "", resources: "", assessment: "", shared: false };

export default function LessonPlanDialog({ open, onOpenChange, context, onSaved }) {
  const { user, school } = useSchool();
  const [plan, setPlan] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setPlan({ ...emptyPlan, ...context, title: context?.title || (context?.class_name ? `${context.class_name} lesson` : "") }); }, [open, context]);
  const save = async (status) => {
    setSaving(true);
    const res = await base44.functions.invoke("manageLessonPlans", { action: "save", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: context?.school_code || school?.school_code, plan: { ...plan, ...context, lesson_date: context?.lesson_date || new Date().toISOString().slice(0, 10), status } });
    setSaving(false);
    if (res.data?.success) { onSaved?.(res.data.plan); onOpenChange(false); }
  };
  const update = (key, value) => setPlan((current) => ({ ...current, [key]: value }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Complete Lesson Plan</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Lesson title</Label><Input className="mt-1" value={plan.title} onChange={(e) => update("title", e.target.value)} /></div>{[["objectives", "Learning objectives"], ["activities", "Activities"], ["resources", "Resources and materials"], ["assessment", "Assessment and evidence"]].map(([key, label]) => <div key={key}><Label>{label}</Label><Textarea className="mt-1 min-h-20" value={plan[key]} onChange={(e) => update(key, e.target.value)} /></div>)}<label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={plan.shared} onChange={(e) => update("shared", e.target.checked)} /> Share this plan with other teachers</label></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="outline" disabled={saving || !plan.title.trim()} onClick={() => save("draft")}>Save Draft</Button><Button disabled={saving || !plan.title.trim()} onClick={() => save("pending_review")}>{saving ? "Saving…" : "Submit for Review"}</Button></DialogFooter></DialogContent></Dialog>;
}