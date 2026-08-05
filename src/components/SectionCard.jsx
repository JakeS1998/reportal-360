import React from "react";

export default function SectionCard({ title, subtitle, icon: Icon, children, className, action }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-7 ${className || ""}`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}