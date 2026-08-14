import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assessmentTypes } from "@/lib/assessmentWeights";

const labels = { classwork: "Classwork", quiz: "Quiz", test: "Test / Exam", essay: "Essay", project: "Project", homework: "Homework", presentation: "Presentation", other: "Other" };

export default function AssessmentWeightsDialog({ open, onOpenChange, onSaved }) {
  const { user, activeSchool } = useSchool();
  const [weights, setWeights] = useState({});
  const [saving, setSaving] = useState(false);
  const total = assessmentTypes.reduce((sum, type) => sum + Number(weights[type] || 0), 0);
  const payload = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: activeSchool?.school_code };

  useEffect(() => {
    if (!open || !activeSchool?.school_code) return;
    base44.functions.invoke("manageAssessmentWeights", { action: "get", ...payload }).then((response) => setWeights(response.data?.weights || {}));
  }, [open, activeSchool?.school_code]);

  const save = async () => {
    setSaving(true);
    const response = await base44.functions.invoke("manageAssessmentWeights", { action: "save", weights, ...payload });
    setSaving(false);
    if (response.data?.success) { onSaved?.(); onOpenChange(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>School assessment weights</DialogTitle></DialogHeader><p className="text-sm text-slate-500">Set how each assessment category contributes to the final grade.</p><div className="grid grid-cols-2 gap-3">{assessmentTypes.map((type) => <label key={type} className="text-xs font-medium text-slate-600">{labels[type]}<input type="number" min="0" max="100" value={weights[type] ?? ""} onChange={(event) => setWeights((current) => ({ ...current, [type]: event.target.value }))} className="mt-1 h-9 w-full rounded-md border border-input px-3 text-sm" /></label>)}</div><p className={`text-sm font-medium ${total === 100 ? "text-emerald-600" : "text-rose-600"}`}>Total: {total}%</p><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || total !== 100} onClick={save}>{saving ? "Saving…" : "Save weights"}</Button></DialogFooter></DialogContent></Dialog>;
}