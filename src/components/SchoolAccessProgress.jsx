import React from "react";
import { Check, LoaderCircle } from "lucide-react";

export default function SchoolAccessProgress({ stage }) {
  const steps = [
    ["recording", "Recording access reason"],
    ["preparing", "Preparing school workspace"],
    ["opening", "Opening your dashboard"],
  ];
  const activeIndex = steps.findIndex(([key]) => key === stage);

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-blue-950">Getting your workspace ready</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {steps.map(([key, label], index) => (
          <div key={key} className="flex items-center gap-2 text-xs text-slate-600">
            {index < activeIndex ? <Check className="h-4 w-4 text-emerald-600" /> : index === activeIndex ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-700" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
            <span className={index <= activeIndex ? "font-medium text-slate-800" : ""}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}