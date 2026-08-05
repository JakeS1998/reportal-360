import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "./Sparkline";
import InfoTooltip from "./InfoTooltip";
import { trendSeries, pctChange } from "@/lib/schoolUtils";

export default function KpiCard({ label, value, previous, suffix, lowerIsBetter, large, accent, tooltip, year }) {
  const hasDelta = previous != null && value != null;
  const diff = hasDelta ? value - previous : null;
  const pct = hasDelta ? pctChange(value, previous) : null;
  const positive = diff != null ? (lowerIsBetter ? diff < 0 : diff > 0) : null;
  const series = trendSeries(value, previous);
  const accentBar = accent || "#1D4ED8";
  return (
    <div
      className={`relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 ${
        large ? "md:col-span-2" : ""
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentBar }} />
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
          {label}
          <InfoTooltip text={tooltip} />
        </p>
      <div className="flex items-end justify-between mt-2 gap-2">
        <p className={`font-bold text-slate-900 leading-none ${large ? "text-4xl" : "text-2xl"}`}>
          {value != null ? value + (suffix || "") : "—"}
        </p>
        <Sparkline data={series} positive={positive} year={year} />
      </div>
      <div className="mt-3 flex items-center gap-2 h-5">
        {hasDelta && pct != null ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {diff > 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        ) : null}
        {previous != null && <span className="text-xs text-slate-400">vs {previous}{suffix || ""}</span>}
      </div>
    </div>
  );
}