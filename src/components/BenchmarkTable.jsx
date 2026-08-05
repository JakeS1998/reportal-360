import React from "react";
import SectionCard from "./SectionCard";
import { ArrowUp, ArrowDown, BarChart3 } from "lucide-react";

export default function BenchmarkTable({ school, benchmarks }) {
  if (!benchmarks) return null;
  const rows = [
    { label: "Academic Achievement", school: school.academic_achievement, ...benchmarks.academic_achievement, suffix: "" },
    { label: "Academic Growth", school: school.academic_growth, ...benchmarks.academic_growth, suffix: "" },
    { label: "Chronic Absenteeism", school: school.chronic_absenteeism, ...benchmarks.chronic_absenteeism, suffix: "%", lowerIsBetter: true },
    { label: "Enrollment", school: school.enrollment, ...benchmarks.enrollment, suffix: "" },
    { label: "Overall Score", school: school._overall, ...benchmarks.overall_score, suffix: "" },
  ].filter((r) => r.school != null && r.county != null);

  return (
    <SectionCard title="School Benchmarking" subtitle="School vs County vs State averages" icon={BarChart3}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 font-medium">Metric</th>
              <th className="py-2 font-medium text-right">School</th>
              <th className="py-2 font-medium text-right">County Avg</th>
              <th className="py-2 font-medium text-right">State Avg</th>
              <th className="py-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const aboveCounty = r.lowerIsBetter ? r.school <= r.county : r.school >= r.county;
              const aboveState = r.lowerIsBetter ? r.school <= r.state : r.school >= r.state;
              return (
                <tr key={r.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 font-medium text-slate-700">{r.label}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">{r.school}{r.suffix}</td>
                  <td className="py-2.5 text-right text-slate-600">{r.county}{r.suffix}</td>
                  <td className="py-2.5 text-right text-slate-600">{r.state}{r.suffix}</td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${aboveCounty ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {aboveCounty ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} Co
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${aboveState ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {aboveState ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />} St
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">County and state averages are AI-modeled estimates based on Alabama public-school norms.</p>
    </SectionCard>
  );
}