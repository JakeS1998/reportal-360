import React from "react";
import { Card } from "@/components/ui/card";

export default function MetricCard({ label, value, sublabel, icon: Icon, accent = "slate" }) {
  const accentColors = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <Card className="p-5 border-slate-200 bg-white rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentColors[accent]}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
      {sublabel && <div className="text-xs text-slate-400 mt-1">{sublabel}</div>}
    </Card>
  );
}