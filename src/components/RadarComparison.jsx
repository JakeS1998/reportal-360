import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function RadarComparison({ school, county, state }) {
  const metrics = [
    { key: "academic_achievement", label: "Achievement" },
    { key: "academic_growth", label: "Growth" },
    { key: "math_proficiency", label: "Math" },
    { key: "reading_proficiency", label: "Reading" },
    { key: "science_proficiency", label: "Science" },
    { key: "chronic_absenteeism", label: "Attendance", inverse: true },
  ];

  const data = metrics.map((m) => {
    const transform = (src) => {
      if (!src || src[m.key] == null) return null;
      return m.inverse ? Math.round((100 - src[m.key]) * 100) / 100 : src[m.key];
    };
    return {
      metric: m.label,
      School: transform(school),
      County: transform(county),
      State: transform(state),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#475569" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94A3B8" }} angle={90} />
        <Radar name="School" dataKey="School" stroke="#1D4ED8" fill="#1D4ED8" fillOpacity={0.25} strokeWidth={2} />
        <Radar name="County" dataKey="County" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.12} strokeWidth={1.5} />
        <Radar name="State" dataKey="State" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.08} strokeWidth={1.5} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          formatter={(v) => (v != null ? v.toFixed(1) : "—")}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}