import React from "react";

export default function SecurityMetricCard({ icon: Icon, label, value, color = "#1D4ED8", subtitle, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}