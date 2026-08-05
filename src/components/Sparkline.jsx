import React from "react";

export default function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return null;
  const w = 72, h = 28, pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((d - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive === null ? "#64748b" : positive ? "#10B981" : "#EF4444";
  const areaPts = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polygon points={areaPts} fill={color} opacity={0.08} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w - pad} cy={h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2)} r={2} fill={color} />
    </svg>
  );
}