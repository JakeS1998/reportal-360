import React from "react";

export default function SectionHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-[#1D4ED8]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#1D4ED8]" />
        </div>
      )}
      <div className="flex-1">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}