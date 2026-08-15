import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

export default function UpcomingPlanAlerts({ classes = [] }) {
  if (!classes.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Lesson plans needing approval in the next 24 hours</h3>
      </div>
      <div className="mt-3 space-y-2">
        {classes.map((item) => (
          <div key={`${item.schedule_id}-${item.starts_at}`} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 text-sm">
            <span className="font-medium text-slate-800">{item.class_name}</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-amber-800"><Clock className="h-3.5 w-3.5" />{item.starts_at}</span>
          </div>
        ))}
      </div>
    </div>
  );
}