import React from "react";
import SectionCard from "./SectionCard";
import Skeleton from "./Skeleton";
import { Sparkles, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";

export default function AiInsightColumns({ ai, loading }) {
  return (
    <SectionCard title="AI Insight Breakdown" subtitle="Strengths, improvement areas, and recommended actions" icon={Sparkles}>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !ai ? (
        <p className="text-sm text-slate-400">Insights unavailable.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SummarySection icon={CheckCircle2} title="Strengths" items={ai.strengths} accent="#10B981" bg="#ECFDF5" />
          <SummarySection icon={AlertCircle} title="Areas for Improvement" items={ai.areas_for_improvement} accent="#F59E0B" bg="#FFFBEB" />
          <SummarySection icon={Lightbulb} title="Recommended Actions" items={ai.recommended_actions} accent="#1D4ED8" bg="#EFF6FF" />
        </div>
      )}
    </SectionCard>
  );
}

function SummarySection({ icon: Icon, title, items, accent, bg }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4" style={{ backgroundColor: bg + "50" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <ul className="space-y-2.5">
        {(items || []).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
            {item}
          </li>
        ))}
        {(!items || items.length === 0) && <li className="text-xs text-slate-400">No data available.</li>}
      </ul>
    </div>
  );
}