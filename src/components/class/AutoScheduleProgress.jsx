import React from "react";
import { Progress } from "@/components/ui/progress";

export default function AutoScheduleProgress({ icon: Icon, title, current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-700 animate-pulse" />
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="ml-auto text-xs font-medium text-slate-500">{current}/{total}</span>
      </div>
      <Progress value={pct} className="h-2" />
      {label && (
        <p className="text-xs text-slate-500 truncate">
          Processing: <span className="font-medium text-slate-700">{label}</span>
        </p>
      )}
    </div>
  );
}