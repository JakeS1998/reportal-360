import React from "react";
import SectionCard from "./SectionCard";
import { Grid3x3 } from "lucide-react";

const COLS = ["Math", "Reading", "Science", "Growth", "Attendance"];

function cellColor(val) {
  if (val == null) return "#F1F5F9";
  if (val >= 80) return "#DCFCE7";
  if (val >= 60) return "#FEF9C3";
  if (val >= 40) return "#FED7AA";
  return "#FECACA";
}
function cellText(val) {
  if (val == null) return "—";
  return val >= 80 ? "#166534" : val >= 60 ? "#854D0E" : val >= 40 ? "#9A3412" : "#991B1B";
}

export default function SubgroupMatrix({ data, studentGroup, gender }) {
  let rows = data || [];
  if (studentGroup && studentGroup !== "All Students") rows = rows.filter((r) => r.name === studentGroup);
  if (gender && gender !== "All Gender") rows = rows.filter((r) => r.name === gender);
  if (!rows.length) return null;
  let min = null, max = null;
  rows.forEach((r) => COLS.forEach((c) => {
    const v = r[c.toLowerCase()];
    if (v != null) { if (min == null || v < min.min) min = { min: v, name: r.name, col: c }; if (max == null || v > max.max) max = { max: v, name: r.name, col: c }; }
  }));

  return (
    <SectionCard title="Student Subgroup Analysis" subtitle="Proficiency by subgroup (2026 student roster)" icon={Grid3x3}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 font-medium">Subgroup</th>
              {COLS.map((c) => <th key={c} className="py-2 font-medium text-center">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4 font-medium text-slate-700 whitespace-nowrap">{r.name}</td>
                {COLS.map((c) => {
                  const v = r[c.toLowerCase()];
                  return (
                    <td key={c} className="py-2.5 text-center">
                      <span className="inline-block min-w-[3rem] px-2 py-1 rounded-md font-semibold text-xs" style={{ backgroundColor: cellColor(v), color: cellText(v) }}>
                        {v != null ? v + "%" : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {max && min && (
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Strongest: {max.name} · {max.col} ({max.max}%)</span>
          <span className="inline-flex items-center gap-1.5 text-rose-700"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Greatest opportunity: {min.name} · {min.col} ({min.min}%)</span>
        </div>
      )}
    </SectionCard>
  );
}