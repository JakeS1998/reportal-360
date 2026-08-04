import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function RevenueBreakdown({ data }) {
  const chartData = [
    { name: "Federal", value: data.federal_revenue || 0, color: "#3b82f6" },
    { name: "State", value: data.state_revenue || 0, color: "#8b5cf6" },
    { name: "Local", value: data.local_revenue || 0, color: "#10b981" },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) return null;

  const formatCurrency = (v) => `$${(v / 1000000).toFixed(1)}M`;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}