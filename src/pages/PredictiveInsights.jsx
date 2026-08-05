import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import SectionCard from "@/components/SectionCard";
import ForecastChart from "@/components/ForecastChart";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { Sparkles, AlertTriangle, Target, Brain, TrendingUp } from "lucide-react";
import { letterGrade, gradeColor } from "@/lib/schoolUtils";

const SEVERITY = {
  high: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444", label: "High" },
  medium: { bg: "#FEF3C7", text: "#854D0E", dot: "#F59E0B", label: "Medium" },
  low: { bg: "#DCFCE7", text: "#166534", dot: "#10B981", label: "Low" },
};

export default function PredictiveInsights() {
  const { school, loading } = useSchool();
  const metrics = useStudentMetrics();

  if (loading || !school) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  const prev = metrics.prev || {};
  const curr = metrics.proficiency;
  const total = metrics.total || 1;

  const project = (current, previous, steps) => {
    if (current == null) return null;
    if (previous == null) return current;
    const delta = current - previous;
    return Math.round((current + delta * steps) * 10) / 10;
  };

  const year = parseInt(school.year || "2026");
  const buildForecast = (current, previous) => [
    { year: String(year - 1), actual: previous, projected: null },
    { year: String(year), actual: current, projected: null },
    { year: String(year + 1), actual: null, projected: project(current, previous, 1) },
    { year: String(year + 2), actual: null, projected: project(current, previous, 2) },
  ];

  const avg3 = (p) => (p?.math != null && p?.reading != null && p?.science != null)
    ? Math.round(((p.math + p.reading + p.science) / 3) * 10) / 10 : null;

  const forecasts = {
    academic_achievement: buildForecast(curr.math, prev.proficiency?.math),
    attendance: buildForecast(metrics.avgAttendance, prev.avgAttendance),
    enrollment: buildForecast(metrics.total, prev.total),
    overall_score: buildForecast(avg3(curr), avg3(prev.proficiency)),
  };

  const projectedScore = forecasts.overall_score[2]?.projected;
  const currentScore = forecasts.overall_score[1]?.actual;
  const projGrade = projectedScore != null ? letterGrade(projectedScore) : "—";

  const lowMath = metrics.roster.filter((r) => r.scores.Math != null && r.scores.Math < 60).length;
  const lowReading = metrics.roster.filter((r) => r.scores.Reading != null && r.scores.Reading < 60).length;
  const ellCount = metrics.subgroups.find((s) => s.label === "English Learners")?.count || 0;

  const insights = [];
  if (metrics.chronic > 0) {
    insights.push({
      title: "Chronic Absenteeism Risk",
      severity: metrics.chronic > total * 0.15 ? "high" : "medium",
      detail: `${metrics.chronic} students have attendance below 90%, putting them at risk of academic decline.`,
      count: metrics.chronic,
    });
  }
  if (lowMath > 0) {
    insights.push({
      title: "Math Proficiency Gap",
      severity: lowMath > total * 0.3 ? "high" : "medium",
      detail: `${lowMath} students are scoring below 60 in Math and may need targeted intervention.`,
      count: lowMath,
    });
  }
  if (lowReading > 0) {
    insights.push({
      title: "Reading Proficiency Gap",
      severity: lowReading > total * 0.3 ? "high" : "medium",
      detail: `${lowReading} students are scoring below 60 in Reading and may need additional support.`,
      count: lowReading,
    });
  }
  if (ellCount > 0) {
    insights.push({
      title: "English Learner Support",
      severity: "low",
      detail: `${ellCount} English Learner students may benefit from additional language support services.`,
      count: ellCount,
    });
  }
  if (insights.length === 0) {
    insights.push({
      title: "No Major Risk Indicators",
      severity: "low",
      detail: "All students are performing above threshold levels based on the current roster.",
      count: 0,
    });
  }

  const atRisk = metrics.chronic + lowMath + lowReading;
  const yoyDelta = curr.math != null && prev.proficiency?.math != null
    ? Math.round((curr.math - prev.proficiency.math) * 10) / 10 : null;
  const interventions = {
    active: insights.filter((i) => i.severity !== "low").length,
    students: atRisk,
    successRate: total > 0 ? Math.max(0, Math.round((1 - atRisk / (total * 2)) * 100)) : null,
    avgImprovement: yoyDelta,
    priorities: insights.filter((i) => i.severity === "high" || i.severity === "medium").map((i) => i.title),
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><Target className="w-3.5 h-3.5" /> Projected Score</div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{projectedScore ?? "—"}</p>
            <p className="text-xs text-slate-400 mt-1">Current: {currentScore ?? "—"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><Brain className="w-3.5 h-3.5" /> Projected Grade</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: gradeColor(projGrade) + "20", color: gradeColor(projGrade) }}>{projGrade}</div>
              <p className="text-xs text-slate-400">Current: <span className="font-semibold" style={{ color: gradeColor(letterGrade(currentScore)) }}>{letterGrade(currentScore)}</span></p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide"><TrendingUp className="w-3.5 h-3.5" /> Intervention Students</div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{interventions.students}</p>
            <p className="text-xs text-slate-400 mt-1">Success rate: {interventions.successRate != null ? interventions.successRate + "%" : "—"}</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={60}>
        <SectionCard title="Predictive Insights" subtitle="Risk indicators derived from the 2026 student roster (updates with filters)" icon={Sparkles}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => {
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
                    {ins.count != null && ins.count > 0 && <p className="text-xs font-semibold text-slate-700 mt-1.5">~{ins.count} students</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={120}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastChart title="Academic Achievement Forecast" data={forecasts.academic_achievement} color="#1D4ED8" />
          <ForecastChart title="Attendance Forecast" data={forecasts.attendance} color="#10B981" unit="%" />
          <ForecastChart title="Enrollment Forecast" data={forecasts.enrollment} color="#0EA5E9" />
          <ForecastChart title="Overall Score Forecast" data={forecasts.overall_score} color="#7C3AED" />
        </div>
      </FadeIn>

      <FadeIn delay={180}>
        <SectionCard title="Intervention Dashboard" subtitle="Current support programs and priorities" icon={AlertTriangle}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Active Interventions" value={interventions.active} />
            <Stat label="Students Supported" value={interventions.students} />
            <Stat label="Success Rate" value={interventions.successRate != null ? interventions.successRate + "%" : null} />
            <Stat label="YoY Improvement" value={yoyDelta != null ? `${yoyDelta > 0 ? "+" : ""}${yoyDelta} pts` : null} />
          </div>
          {interventions.priorities?.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested Priorities</p>
              <div className="space-y-1.5">
                {interventions.priorities.map((pr, i) => (
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