import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import ForecastChart from "@/components/ForecastChart";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { Sparkles, AlertTriangle, Target, Brain, TrendingUp } from "lucide-react";
import { computeOverallScore, letterGrade, gradeColor } from "@/lib/schoolUtils";

const SEVERITY = {
  high: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444", label: "High" },
  medium: { bg: "#FEF3C7", text: "#854D0E", dot: "#F59E0B", label: "Medium" },
  low: { bg: "#DCFCE7", text: "#166534", dot: "#10B981", label: "Low" },
};

export default function PredictiveInsights() {
  const { school, loading } = useSchool();
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  const overall = school ? computeOverallScore(school) : null;
  const prevOverall = school?.previous ? computeOverallScore(school.previous) : null;

  useEffect(() => {
    if (!school || overall == null) return;
    setAiLoading(true);
    const p = school.previous || {};
    const prompt = `You are a predictive education analytics assistant. Given this Alabama school's data, generate forward-looking insights and forecasts for the next 2 years.

School: ${school.school_name} (${school.school_type}, FY ${school.year})
Current / Previous:
- Academic Achievement: ${school.academic_achievement} / ${p.academic_achievement ?? "—"}
- Academic Growth: ${school.academic_growth} / ${p.academic_growth ?? "—"}
- Chronic Absenteeism: ${school.chronic_absenteeism}% / ${p.chronic_absenteeism ?? "—"}%
- Graduation Rate: ${school.graduation_rate ?? "—"}% / ${p.graduation_rate ?? "—"}%
- Enrollment: ${school.enrollment ?? "—"} / ${p.enrollment ?? "—"}
- Math: ${school.math_proficiency ?? "—"}% / ${p.math_proficiency ?? "—"}%
- Reading: ${school.reading_proficiency ?? "—"}% / ${p.reading_proficiency ?? "—"}%
- Science: ${school.science_proficiency ?? "—"}% / ${p.science_proficiency ?? "—"}%
- Overall composite: ${overall} / ${prevOverall ?? "—"}

Return JSON: {
  "insights": [ {"title":string,"severity":"high|medium|low","detail":string,"count":number}, ... ],
  "projectedScore": number,
  "projectedGrade": "A|B|C|D|F",
  "forecasts": {
    "academic_achievement": [ {"year":"2024","actual":number,"projected":null}, {"year":"2025","actual":number,"projected":null}, {"year":"2026","actual":null,"projected":number}, {"year":"2027","actual":null,"projected":number} ],
    "attendance": [ ... same shape using 100-chronic_absenteeism ... ],
    "enrollment": [ ... ],
    "overall_score": [ ... ]
  },
  "interventions": { "active": number, "students": number, "successRate": number, "avgImprovement": number, "priorities": [string, ...] }
}`;
    base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          insights: { type: "array" },
          projectedScore: { type: "number" },
          projectedGrade: { type: "string" },
          forecasts: { type: "object" },
          interventions: { type: "object" },
        },
        required: ["insights", "projectedScore", "projectedGrade", "forecasts", "interventions"],
      },
    })
      .then(setAi)
      .catch(() => setAi(null))
      .finally(() => setAiLoading(false));
  }, [school, overall, prevOverall]);

  if (loading || !school) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  const fc = ai?.forecasts || {};
  const projGrade = ai?.projectedGrade || "—";

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><Target className="w-3.5 h-3.5" /> Projected Score</div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{aiLoading ? "…" : ai?.projectedScore ?? "—"}</p>
            <p className="text-xs text-slate-400 mt-1">Current: {overall ?? "—"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><Brain className="w-3.5 h-3.5" /> Projected Grade</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: gradeColor(projGrade) + "20", color: gradeColor(projGrade) }}>{projGrade}</div>
              <p className="text-xs text-slate-400">Current: <span className="font-semibold" style={{ color: gradeColor(letterGrade(overall)) }}>{letterGrade(overall)}</span></p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><TrendingUp className="w-3.5 h-3.5" /> Intervention Students</div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{aiLoading ? "…" : ai?.interventions?.students ?? "—"}</p>
            <p className="text-xs text-slate-400 mt-1">Success rate: {ai?.interventions?.successRate != null ? ai.interventions.successRate + "%" : "—"}</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={60}>
        <SectionCard title="AI Predictive Insights" subtitle="Risk indicators and recommended focus areas" icon={Sparkles}>
          {aiLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : ai?.insights?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ai.insights.map((ins, i) => {
                const s = SEVERITY[ins.severity] || SEVERITY.medium;
                return (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 flex items-start gap-3" style={{ backgroundColor: s.bg + "30" }}>
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: s.dot }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{ins.title}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.detail}</p>
                      {ins.count != null && <p className="text-xs font-semibold text-slate-700 mt-1.5">~{ins.count} students</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Insights unavailable.</p>
          )}
        </SectionCard>
      </FadeIn>

      <FadeIn delay={120}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastChart title="Academic Achievement Forecast" data={fc.academic_achievement} color="#1D4ED8" />
          <ForecastChart title="Attendance Forecast" data={fc.attendance} color="#10B981" unit="%" />
          <ForecastChart title="Enrollment Forecast" data={fc.enrollment} color="#0EA5E9" />
          <ForecastChart title="Overall Score Forecast" data={fc.overall_score} color="#7C3AED" />
        </div>
      </FadeIn>

      <FadeIn delay={180}>
        <SectionCard title="Intervention Dashboard" subtitle="Current support programs and priorities" icon={AlertTriangle}>
          {aiLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Active Interventions" value={ai?.interventions?.active} />
              <Stat label="Students Supported" value={ai?.interventions?.students} />
              <Stat label="Success Rate" value={ai?.interventions?.successRate != null ? ai.interventions.successRate + "%" : null} />
              <Stat label="Avg Improvement" value={ai?.interventions?.avgImprovement != null ? ai.interventions.avgImprovement + "%" : null} />
            </div>
          )}
          {ai?.interventions?.priorities?.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested Priorities</p>
              <div className="space-y-1.5">
                {ai.interventions.priorities.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    {pr}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>
      </FadeIn>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value != null ? value : "—"}</p>
    </div>
  );
}