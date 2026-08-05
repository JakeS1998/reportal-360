import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function ForecastChart({ title, data, color, unit }) {
  if (!data || !data.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
            formatter={(v) => (v != null ? `${v}${unit || ""}` : "—")}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="actual" name="Actual" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          <Line dataKey="projected" name="Projected" stroke={color} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}