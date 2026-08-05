import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

export default function SubjectProficiencyChart({ school, county, state }) {
  const data = [
    { subject: "Math", School: school.math_proficiency, Previous: school.previous?.math_proficiency, County: county?.math_proficiency, State: state?.math_proficiency },
    { subject: "Reading", School: school.reading_proficiency, Previous: school.previous?.reading_proficiency, County: county?.reading_proficiency, State: state?.reading_proficiency },
    { subject: "Science", School: school.science_proficiency, Previous: school.previous?.science_proficiency, County: county?.science_proficiency, State: state?.science_proficiency },
  ];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} barGap={2} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="subject" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          formatter={(v) => (v != null ? `${v}%` : "—")}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={80} stroke="#F97316" strokeDasharray="5 4" label={{ value: "Target 80%", position: "right", fill: "#F97316", fontSize: 10 }} />
        <Bar dataKey="Previous" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="State" fill="#94A3B8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="County" fill="#60A5FA" radius={[4, 4, 0, 0]} />
        <Bar dataKey="School" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}