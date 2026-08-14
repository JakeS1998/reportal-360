import React, { useState } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import AssessmentWeightsDialog from "@/components/class/AssessmentWeightsDialog";
import { GraduationCap } from "lucide-react";

export default function AssessmentWeights() {
  const { canManageStaff } = useSchool();
  const [open, setOpen] = useState(false);
  if (!canManageStaff) return <p className="py-16 text-center text-sm text-slate-400">School manager access is required.</p>;
  return <div className="space-y-5"><div><h2 className="text-lg font-bold text-slate-900">Assessment Weights</h2><p className="text-sm text-slate-500">Define the school-wide contribution of each assessment type to class grades.</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><Button onClick={() => setOpen(true)}><GraduationCap className="mr-1.5 h-4 w-4" />Configure weights</Button></div><AssessmentWeightsDialog open={open} onOpenChange={setOpen} /></div>;
}