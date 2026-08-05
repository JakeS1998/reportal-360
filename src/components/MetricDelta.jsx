import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export default function MetricDelta({ current, previous, lowerIsBetter = false, suffix = "" }) {
  if (current == null || previous == null) return null;

  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400 mt-1">
        <Minus className="w-3 h-3" /> No change
      </span>
    );
  }

  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const isUp = delta > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  const color = improved ? "text-emerald-600" : "text-rose-600";
  const sign = delta > 0 ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium mt-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {sign}{delta}{suffix} vs last year
    </span>
  );
}