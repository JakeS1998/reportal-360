import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CopyLessonPlanDialog({ plan, open, onOpenChange, onCopied }) {
  const { user, school } = useSchool();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!open || !school?.school_code) return;
    setClassId("");
    base44.entities.Class.filter({ school_code: school.school_code, status: "active" }, "class_name", 500).then(setClasses);
  }, [open, school?.school_code]);

  const copyPlan = async () => {
    const target = classes.find((item) => item.id === classId);
    if (!target) return;
    setCopying(true);
    const result = await base44.functions.invoke("manageLessonPlans", {
      action: "clone", plan_id: plan.id, target_class_id: target.id, target_class_name: target.class_name,
      caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "",
      caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code,
    });
    setCopying(false);
    if (result.data?.success) { onCopied?.(); onOpenChange(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Copy lesson plan to a class</DialogTitle></DialogHeader><div><Label>Destination class</Label><select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="">Select a class…</option>{classes.filter((item) => item.id !== plan?.class_id).map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</select></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!classId || copying} onClick={copyPlan}>{copying ? "Copying…" : "Copy to Class"}</Button></DialogFooter></DialogContent></Dialog>;
}