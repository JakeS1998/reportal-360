import React from "react";
import SectionCard from "./SectionCard";
import { Gauge } from "lucide-react";

const SEGMENTS = [
  { key: "achievement", label: "Academic Achievement", weight: 30, field: "academic_achievement", max: 100, color: "#1D4ED8" },
  { key: "growth", label: "Academic Growth", weight: 30, field: "academic_growth", max: 100, color: "#7C3AED" },
  { key: "absenteeism", label: "Chronic Absenteeism", weight: 20, field: "chronic_absenteeism", max: 100, color: "#F59E0B", inverse: true },
  { key: "graduation", label: "Graduation Rate", weight: 20, field: "graduation_rate", max: 100, color: "#10B981", highOnly: true },
  { key: "ccr", label: "College & Career Readiness", weight: 20, field: "ccr_score", max: 100, color: "#0EA5E9", highOnly: true },
];

export default function AccountabilityBar({ school }) {
  const isHigh = school?.school_type === "High";
  const segs = SEGMENTS.filter((s) => !s.highOnly || isHigh).filter((s) => school?.[s.field] != null);
  const totalWeight = segs.reduce((a, s) => a + s.weight, 0) || 1;

  return (
    <SectionCard title="Accountability Breakdown" subtitle="Weighted contribution to overall score" icon={Gauge}>
      <div className="flex w-full h-8 rounded-lg overflow-hidden border border-slate-200">
        {segs.map((s) => {
          const val = s.inverse ? 100 - school[s.field] : school[s.field];
          const filled = (val / s.max) * 100;
          return (
            <div
              key={s.key}
              style={{ width: `${(s.weight / totalWeight) * 100}%`, backgroundColor: s.color }}
              className="relative h-full flex items-center justify-center text-[10px] font-semibold text-white"
              title={`${s.label}: ${school[s.field]}${s.field === "chronic_absenteeism" ? "%" : ""}`}
            >
              <div className="absolute left-0 top-0 h-full bg-black/20" style={{ width: `${100 - filled}%` }} />
              <span className="relative z-10">{school[s.field]}{s.field === "chronic_absenteeism" ? "%" : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {segs.map((s) => (
          <div key={s.key} className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: s.color }} />
            <div>
              <p className="text-xs font-medium text-slate-700">{s.label}</p>
              <p className="text-[11px] text-slate-400">
                Weight {Math.round((s.weight / totalWeight) * 100)}% · Score {school[s.field]}{s.field === "chronic_absenteeism" ? "%" : ""}/{s.max}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        Note: CCR data is not available in the current ALSDE feed; graduation weighting applies to high schools only.
      </p>
    </SectionCard>
  );
}