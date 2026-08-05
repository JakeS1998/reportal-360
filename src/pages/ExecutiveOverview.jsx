import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import AccountabilityBar from "@/components/AccountabilityBar";
import BenchmarkTable from "@/components/BenchmarkTable";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { computeOverallScore, letterGrade, gradeColor } from "@/lib/schoolUtils";
import { Sparkles, FileText, Award, TrendingUp } from "lucide-react";

export default function ExecutiveOverview() {
  const { school, loading } = useSchool();
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  const overall = school ? computeOverallScore(school) : null;
  const prevOverall = school?.previous ? computeOverallScore(school.previous) : null;
  const grade = letterGrade(overall);
  const prevGrade = letterGrade(prevOverall);
  const schoolWithScore = school ? { ...school, _overall: overall } : null;

  useEffect(() => {
    if (!school || !school.academic_achievement) return;
    setAiLoading(true);
    const p = school.previous || {};
    const prompt = `You are an education analytics assistant for Alabama school leaders. Given this ALSDE report card data, produce (a) a 2-3 sentence executive summary highlighting strengths, weaknesses, and year-over-year changes, and (b) estimated county and state average benchmarks for each metric using your knowledge of Alabama public school norms.

School: ${school.school_name} — ${school.system_name} (${school.school_type}, FY ${school.year})
- Academic Achievement: ${school.academic_achievement} (prev ${p.academic_achievement ?? "—"})
- Academic Growth: ${school.academic_growth} (prev ${p.academic_growth ?? "—"})
- Chronic Absenteeism: ${school.chronic_absenteeism}% (prev ${p.chronic_absenteeism ?? "—"}%)
- Graduation Rate: ${school.graduation_rate ?? "—"}% (prev ${p.graduation_rate ?? "—"}%)
- Enrollment: ${school.enrollment ?? "—"} (prev ${p.enrollment ?? "—"})
- Math Proficiency: ${school.math_proficiency ?? "—"}%
- Reading Proficiency: ${school.reading_proficiency ?? "—"}%
- Science Proficiency: ${school.science_proficiency ?? "—"}%
- Overall composite score: ${overall}

Return JSON with: summary (string), benchmarks (object with keys academic_achievement, academic_growth, chronic_absenteeism, enrollment, overall_score — each {county: number, state: number}).`;
    base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          benchmarks: {
            type: "object",
            properties: {
              academic_achievement: { type: "object", properties: { county: { type: "number" }, state: { type: "number" } } },
              academic_growth: { type: "object", properties: { county: { type: "number" }, state: { type: "number" } } },
              chronic_absenteeism: { type: "object", properties: { county: { type: "number" }, state: { type: "number" } } },
              enrollment: { type: "object", properties: { county: { type: "number" }, state: { type: "number" } } },
              overall_score: { type: "object", properties: { county: { type: "number" }, state: { type: "number" } } },
            },
          },
        },
        required: ["summary", "benchmarks"],
      },
    })
      .then((res) => setAi(res))
      .catch(() => setAi(null))
      .finally(() => setAiLoading(false));
  }, [school, overall]);

  if (loading || !school) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const p = school.previous || {};

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Overall School Score" value={overall} previous={prevOverall} large accent="#1D4ED8" />
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Letter Grade</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: gradeColor(grade) + "20", color: gradeColor(grade) }}>
                {grade}
              </div>
              <div>
                <p className="text-xs text-slate-400">Previous: <span className="font-semibold" style={{ color: gradeColor(prevGrade) }}>{prevGrade}</span></p>
                <p className="text-[11px] text-slate-400 mt-0.5">Derived composite</p>
              </div>
            </div>
          </div>
          <KpiCard label="Academic Achievement" value={school.academic_achievement} previous={p.academic_achievement} accent="#1D4ED8" />
          <KpiCard label="Academic Growth" value={school.academic_growth} previous={p.academic_growth} accent="#7C3AED" />
          <KpiCard label="Chronic Absenteeism" value={school.chronic_absenteeism} previous={p.chronic_absenteeism} suffix="%" lowerIsBetter accent="#F59E0B" />
          <KpiCard label="Enrollment" value={school.enrollment} previous={p.enrollment} accent="#0EA5E9" />
          <KpiCard label="Graduation Rate" value={school.graduation_rate} previous={p.graduation_rate} suffix="%" accent="#10B981" />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={60}>
          <AccountabilityBar school={school} />
        </FadeIn>
        <FadeIn delay={120}>
          <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
            {aiLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : ai?.summary ? (
              <p className="text-sm text-slate-700 leading-relaxed">{ai.summary}</p>
            ) : (
              <p className="text-sm text-slate-400">Summary unavailable.</p>
            )}
          </SectionCard>
        </FadeIn>
      </div>

      <FadeIn delay={180}>
        <BenchmarkTable school={schoolWithScore} benchmarks={ai?.benchmarks} />
      </FadeIn>
    </div>
  );
}