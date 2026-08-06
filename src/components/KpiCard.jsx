import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "./Sparkline";
import InfoTooltip from "./InfoTooltip";
import { trendSeries, pctChange } from "@/lib/schoolUtils";
import { useCountUp } from "@/hooks/useCountUp";

export default function KpiCard({ label, value, previous, suffix, lowerIsBetter, large, accent, tooltip, year, onClick, signed }) {
  const hasDelta = previous != null && value != null;
  const diff = hasDelta ? value - previous : null;
  const pct = hasDelta ? pctChange(value, previous) : null;
  const positive = diff != null ? (lowerIsBetter ? diff < 0 : diff > 0) : null;
  const series = trendSeries(typeof value === "string" ? null : value, previous);
  const accentBar = accent || "#1D4ED8";
  const isStringValue = typeof value === "string";
  const animatedValue = useCountUp(isStringValue ? null : value, 800);
  const displayValue = isStringValue
    ? value + (suffix || "")
    : value != null
      ? (signed && value > 0 ? "+" : "") + (Number.isInteger(value) ? Math.round(animatedValue).toLocaleString() : animatedValue.toFixed(1)) + (suffix || "")
      : "—";

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group ${
        onClick ? "cursor-pointer" : ""
      } ${large ? "md:col-span-2" : ""}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accentBar }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
          {label}
          <InfoTooltip text={tooltip} />
        </p>
        <div className="w-2 h-2 rounded-full opacity-30 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accentBar }} />
      </div>
      <div className="flex items-end justify-between mt-3 gap-3">
        <p className={`font-bold leading-none tabular-nums transition-all duration-500 ${large ? "text-5xl" : "text-3xl"}`} style={{ color: "#091B3D" }}>
          {displayValue}
        </p>
        <Sparkline data={series} positive={positive} year={year} />
      </div>
      <div className="mt-4 flex items-center gap-2 h-6">
        {hasDelta && pct != null ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
              positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {diff > 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        ) : null}
        {previous != null && <span className="text-xs text-slate-400">vs {previous}{suffix || ""}</span>}
      </div>
    </div>
  );
}