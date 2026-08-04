import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ProficiencyChart({ data }) {
  const chartData = [
    { subject: "Math", proficiency: data.math_proficiency ?? 0 },
    { subject: "Reading", proficiency: data.reading_proficiency ?? 0 },
    { subject: "Science", proficiency: data.science_proficiency ?? 0 },
  ];

  const colors = ["#3b82f6", "#8b5cf6", "#10b981"];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="subject" tick={{ fontSize: 13, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
            formatter={(value) => [`${value}%`, "Proficiency"]}
          />
          <Bar dataKey="proficiency" radius={[8, 8, 0, 0]} barSize={60}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}