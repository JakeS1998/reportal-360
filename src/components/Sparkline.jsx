import React, { useState, useRef } from "react";

export default function Sparkline({ data, positive, year }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length < 2) return null;
  const w = 94, h = 30, pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d - min) / range) * (h - pad * 2);
    return { x, y, value: d, idx: i };
  });

  const pts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const color = positive === null ? "#64748b" : positive ? "#10B981" : "#EF4444";
  const areaPts = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;

  const currentYear = year ? parseInt(year) : null;
  const prevYear = currentYear != null ? currentYear - 1 : null;

  const getYearLabel = (idx) => {
    if (currentYear == null) return "";
    const mid = Math.floor((data.length - 1) / 2);
    return idx <= mid ? `FY ${prevYear}` : `FY ${currentYear}`;
  };

  const handleMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const lastPoint = points[points.length - 1];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <polygon points={areaPts} fill={color} opacity={0.08} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        {hovered && <circle cx={hovered.x} cy={hovered.y} r={3} fill={color} stroke="white" strokeWidth={1.5} />}
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2} fill={color} />
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white shadow-lg z-50">
          {getYearLabel(hoverIdx)}: {hovered.value}
        </div>
      )}
    </div>
  );
}