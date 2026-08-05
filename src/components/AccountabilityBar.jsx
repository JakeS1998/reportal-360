import React, { useState } from "react";
import SectionCard from "./SectionCard";
import InfoTooltip from "./InfoTooltip";
import { Gauge } from "lucide-react";

const SEGMENTS = [
  { key: "achievement", label: "Academic Achievement", weight: 30, field: "academic_achievement", max: 100, color: "#1D4ED8", tooltip: "ALSDE Academic Achievement indicator — measures the percentage of students scoring proficient on state assessments (ACAP for K-8, ACT for high school)." },
  { key: "growth", label: "Academic Growth", weight: 30, field: "academic_growth", max: 100, color: "#7C3AED", tooltip: "ALSDE Academic Growth indicator — measures student academic progress relative to similar peers over time, rewarding schools that help students improve." },
  { key: "absenteeism", label: "Chronic Absenteeism", weight: 20, field: "chronic_absenteeism", max: 100, color: "#F59E0B", inverse: true, tooltip: "Percentage of students missing 15 or more school days in a year. Lower rates are better — the score is inverted (100 − rate) before applying the weight." },
  { key: "graduation", label: "Graduation Rate", weight: 20, field: "graduation_rate", max: 100, color: "#10B981", highOnly: true, tooltip: "Percentage of students graduating within four years of entering high school. Applies to high schools only." },
  { key: "ccr", label: "College & Career Readiness", weight: 20, field: "ccr_score", max: 100, color: "#0EA5E9", highOnly: true, tooltip: "College and Career Readiness indicator — measures the percentage of students meeting benchmarks for post-secondary success. Applies to high schools only." },
];

function toPercents(values, total) {
  const exact = values.map((v) => (v / total) * 100);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const fracs = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) floored[fracs[i].i]++;
  return floored;
}

export default function AccountabilityBar({ school }) {
  const [hovered, setHovered] = useState(null);
  const isHigh = school?.school_type === "High";
  const segs = SEGMENTS.filter((s) => !s.highOnly || isHigh).filter((s) => school?.[s.field] != null);
  const totalWeight = segs.reduce((a, s) => a + s.weight, 0) || 1;
  const percents = toPercents(segs.map((s) => s.weight), totalWeight);

  const segData = segs.map((s, idx) => {
    const val = s.inverse ? 100 - school[s.field] : school[s.field];
    const contribution = ((s.weight / totalWeight) * val / 100).toFixed(1);
    const centerPct = segs.slice(0, idx).reduce((a, seg) => a + seg.weight, 0) / totalWeight * 100 + (s.weight / totalWeight) * 50;
    return { ...s, val, contribution, centerPct, pct: percents[idx] };
  });

  return (
    <SectionCard title="Accountability Breakdown" subtitle="Weighted contribution to overall score" icon={Gauge}>
      <div className="relative pb-2">
        <div className="flex w-full h-8 rounded-lg overflow-hidden border border-slate-200">
          {segData.map((s) => (
            <div
              key={s.key}
              style={{ width: `${(s.weight / totalWeight) * 100}%`, backgroundColor: s.color }}
              className="relative h-full flex items-center justify-center text-[10px] font-semibold text-white cursor-help"
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="absolute left-0 top-0 h-full bg-black/20" style={{ width: `${100 - (s.val / s.max) * 100}%` }} />
              <span className="relative z-10">{school[s.field]}{s.field === "chronic_absenteeism" ? "%" : ""}</span>
            </div>
          ))}
        </div>
        {hovered && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: `${hovered.centerPct}%`, top: "0px", transform: "translate(-50%, -100%)" }}
          >
            <div className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-medium text-white shadow-lg w-60 leading-relaxed text-center">
              <p className="font-semibold mb-1">{hovered.label}</p>
              <p className="text-slate-300">{hovered.tooltip}</p>
              <p className="text-slate-400 mt-1.5 border-t border-slate-600 pt-1.5">
                Weight {hovered.pct}% × Score {school[hovered.field]}{hovered.field === "chronic_absenteeism" ? "%" : ""} → {hovered.contribution} pts
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {segData.map((s) => {
          const fullTooltip = `${s.tooltip} Calculation: weight ${s.pct}% × score ${school[s.field]}${s.field === "chronic_absenteeism" ? "%" : ""} ÷ 100 = ${s.contribution} contribution points.`;
          return (
            <div key={s.key} className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: s.color }} />
              <div>
                <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  {s.label}
                  <InfoTooltip text={fullTooltip} />
                </p>
                <p className="text-[11px] text-slate-400">
                  Weight {s.pct}% · Score {school[s.field]}{s.field === "chronic_absenteeism" ? "%" : ""}/{s.max}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        Note: CCR data is not available in the current ALSDE feed; graduation weighting applies to high schools only.
      </p>
    </SectionCard>
  );
}