import React from "react";
import SectionCard from "./SectionCard";
import ExportMenu from "./ExportMenu";
import { computeOverallScore } from "@/lib/schoolUtils";
import { ArrowUp, ArrowDown, BarChart3 } from "lucide-react";

const CATEGORY_COLORS = {
  "Academic Achievement": "#1D4ED8",
  "Academic Growth": "#7C3AED",
  "Chronic Absenteeism": "#F59E0B",
  "Graduation Rate": "#10B981",
};

function getBadgeClass(diff, lowerIsBetter) {
  if (diff == null) return null;
  const absDiff = Math.abs(diff);
  const isBetter = lowerIsBetter ? diff <= 0 : diff >= 0;
  if (absDiff < 2) return "bg-amber-50 text-amber-600 border border-amber-100";
  return isBetter ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100";
}

export default function BenchmarkTable({ school, county, state }) {
  if (!county && !state) return null;
  const countyOverall = county ? computeOverallScore(county) : null;
  const stateOverall = state ? computeOverallScore(state) : null;
  const rows = [
    { label: "Academic Achievement", school: school.academic_achievement, county: county?.academic_achievement, state: state?.academic_achievement, suffix: "" },
    { label: "Academic Growth", school: school.academic_growth, county: county?.academic_growth, state: state?.academic_growth, suffix: "" },
    { label: "Chronic Absenteeism", school: school.chronic_absenteeism, county: county?.chronic_absenteeism, state: state?.chronic_absenteeism, suffix: "%", lowerIsBetter: true },
    { label: "Math Proficiency", school: school.math_proficiency, county: county?.math_proficiency, state: state?.math_proficiency, suffix: "%" },
    { label: "Reading Proficiency", school: school.reading_proficiency, county: county?.reading_proficiency, state: state?.reading_proficiency, suffix: "%" },
    { label: "Science Proficiency", school: school.science_proficiency, county: county?.science_proficiency, state: state?.science_proficiency, suffix: "%" },
    { label: "Graduation Rate", school: school.graduation_rate, county: county?.graduation_rate, state: state?.graduation_rate, suffix: "%" },
    { label: "Overall Score", school: school._overall, county: countyOverall, state: stateOverall, suffix: "" },
  ].filter((r) => r.school != null && (r.county != null || r.state != null));

  if (rows.length === 0) return null;

  return (
    <SectionCard
      title="School Benchmarking"
      subtitle={`${school.school_name} vs ${county?.school_name || "County"} vs State averages`}
      icon={BarChart3}
      action={<ExportMenu tableId="benchmark-table" fileName="school-benchmark" />}
    >
      <div className="overflow-x-auto">
        <table id="benchmark-table" className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-3 px-3 font-medium">Metric</th>
              <th className="py-3 px-3 font-medium text-right">School</th>
              <th className="py-3 px-3 font-medium text-right">{county?.school_name || "County Avg"}</th>
              <th className="py-3 px-3 font-medium text-right">State Avg</th>
              <th className="py-3 px-3 font-medium text-center">vs County</th>
              <th className="py-3 px-3 font-medium text-center">vs State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const diffCounty = r.county != null ? r.school - r.county : null;
              const diffState = r.state != null ? r.school - r.state : null;
              const countyBadge = getBadgeClass(diffCounty, r.lowerIsBetter);
              const stateBadge = getBadgeClass(diffState, r.lowerIsBetter);
              const countyBetter = r.lowerIsBetter ? diffCounty <= 0 : diffCounty >= 0;
              const stateBetter = r.lowerIsBetter ? diffState <= 0 : diffState >= 0;
              const color = CATEGORY_COLORS[r.label];
              return (
                <tr key={r.label} className={`border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/70 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                  <td className="py-3.5 px-3 font-medium text-slate-700">
                    {color && <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: color }} />}
                    {r.label}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums">{r.school != null ? `${r.school}${r.suffix}` : "—"}</td>
                  <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums">{r.county != null ? `${r.county}${r.suffix}` : "—"}</td>
                  <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums">{r.state != null ? `${r.state}${r.suffix}` : "—"}</td>
                  <td className="py-3.5 px-3 text-center">
                    {diffCounty != null ? (
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-md ${countyBadge}`}>
                        {countyBetter ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(diffCounty).toFixed(1)}{r.suffix}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {diffState != null ? (
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-md ${stateBadge}`}>
                        {stateBetter ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(diffState).toFixed(1)}{r.suffix}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-4">Source: ALSDE Report Card system and state aggregate data (FY {school.year}). Green = above benchmark, Amber = within 2 points, Red = below benchmark.</p>
    </SectionCard>
  );
}