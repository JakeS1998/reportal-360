import React from "react";
import { FileText } from "lucide-react";
import SectionCard from "@/components/SectionCard";

export default function StudentSupportPlans({ plans = [] }) {
  if (!plans.length) return null;
  return <SectionCard title="Support Plans" icon={FileText}><div className="space-y-2">{plans.map((plan, index) => <a key={`${plan.file_url}-${index}`} href={plan.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="font-medium">{plan.title}</span><span className="text-xs text-slate-400">{plan.file_name}</span></a>)}</div></SectionCard>;
}