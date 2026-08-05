import React from "react";
import { Card } from "@/components/ui/card";

const RACE_COLORS = {
  White: "#6366f1",
  "Black or African American": "#0ea5e9",
  Asian: "#10b981",
  "American Indian / Alaska Native": "#f59e0b",
  "Native Hawaiian / Pacific Islander": "#ec4899",
  "Two or more races": "#8b5cf6",
};

export default function DemographicsSection({ data }) {
  const race = (data.demographics_race || []).filter((d) => d.percent != null);
  const subgroups = (data.demographics_subgroups || []).filter((d) => d.count != null);

  if (!race.length && !subgroups.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
      {race.length > 0 && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Race / Ethnicity</h3>
          <div className="space-y-3">
            {race.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">{d.label}</span>
                  <span className="font-semibold text-slate-900">{d.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.percent}%`, backgroundColor: RACE_COLORS[d.label] || "#64748b" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {subgroups.length > 0 && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Student Subgroups</h3>
          <div className="grid grid-cols-2 gap-3">
            {subgroups.map((d) => (
              <div key={d.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500 leading-tight">{d.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{d.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}