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
import { Sparkles, FileText, Award, TrendingUp, Trophy, Crown, Radar as RadarIcon } from "lucide-react";
import LeaderboardCard from "@/components/LeaderboardCard";
import RadarComparison from "@/components/RadarComparison";

export default function ExecutiveOverview() {
  const { school, loading } = useSchool();
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [countyLb, setCountyLb] = useState({ loading: true });
  const [stateLb, setStateLb] = useState({ loading: true });

  const overall = school ? computeOverallScore(school) : null;
  const prevOverall = school?.previous ? computeOverallScore(school.previous) : null;
  const grade = letterGrade(overall);
  const prevGrade = letterGrade(prevOverall);
  const schoolWithScore = school ? { ...school, _overall: overall } : null;

  useEffect(() => {
    if (!school || !school.academic_achievement) return;
    setAiLoading(true);
    const p = school.previous || {};
    const c = school.county || {};
    const s = school.state || {};
    const prompt = `You are an education analytics assistant for Alabama school leaders. Given this ALSDE report card data, produce a 2-3 sentence executive summary highlighting strengths, weaknesses, and year-over-year changes. Reference how the school compares to county and state averages where relevant.

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

County averages (${c.school_name || "system"}): Academic Achievement ${c.academic_achievement ?? "—"}, Growth ${c.academic_growth ?? "—"}, Chronic Absenteeism ${c.chronic_absenteeism ?? "—"}%, Math ${c.math_proficiency ?? "—"}%, Reading ${c.reading_proficiency ?? "—"}%, Graduation ${c.graduation_rate ?? "—"}%
State averages: Academic Achievement ${s.academic_achievement ?? "—"}, Growth ${s.academic_growth ?? "—"}, Chronic Absenteeism ${s.chronic_absenteeism ?? "—"}%, Math ${s.math_proficiency ?? "—"}%, Reading ${s.reading_proficiency ?? "—"}%, Graduation ${s.graduation_rate ?? "—"}%

Return JSON with: summary (string).`;
    base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
    })
      .then((res) => setAi(res))
      .catch(() => setAi(null))
      .finally(() => setAiLoading(false));
  }, [school, overall]);

  useEffect(() => {
    if (!school || !school.system_code) return;
    setCountyLb({ loading: true });
    setStateLb({ loading: true });
    base44.functions.invoke("getLeaderboard", {
      action: "county",
      systemCode: school.system_code,
      schoolCode: school.school_code,
    }).then((res) => setCountyLb(res.data || { error: "Unable to load leaderboard" }))
      .catch(() => setCountyLb({ error: "Unable to load leaderboard" }));
    base44.functions.invoke("getLeaderboard", {
      action: "state",
      myScore: overall,
      schoolName: school.school_name,
      systemName: school.system_name,
    }).then((res) => setStateLb(res.data || { error: "Unable to load leaderboard" }))
      .catch(() => setStateLb({ error: "Unable to load leaderboard" }));
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
        <BenchmarkTable school={schoolWithScore} county={school.county} state={school.state} />
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={240}>
          <LeaderboardCard
            title="County Leaderboard"
            subtitle={`Top schools in ${school.system_name || "your system"}`}
            icon={Trophy}
            loading={countyLb.loading}
            error={countyLb.error}
            items={(countyLb.top5 || []).map((s) => ({
              name: s.school_name,
              sublabel: s.school_type,
              score: s.score,
              isMe: s.school_code === school.school_code,
            }))}
            myRank={countyLb.myRank ? `#${countyLb.myRank}` : null}
            myItem={countyLb.mySchool && countyLb.myRank > 5 ? {
              name: countyLb.mySchool.school_name,
              sublabel: "Your school",
              score: countyLb.mySchool.score,
            } : null}
            footer={countyLb.totalSchools ? `Ranked ${countyLb.totalSchools} schools · Source: ALSDE FY 2025` : null}
          />
        </FadeIn>
        <FadeIn delay={300}>
          <LeaderboardCard
            title="State Leaderboard"
            subtitle="Top public schools in Alabama"
            icon={Crown}
            loading={stateLb.loading}
            error={stateLb.error}
            items={(stateLb.top5 || []).map((s) => ({
              name: s.name,
              sublabel: s.system,
              score: s.score,
              isMe: false,
            }))}
            myRank={stateLb.myEstimatedRank || null}
            myItem={{
              name: school.school_name,
              sublabel: stateLb.myPercentile != null ? `${stateLb.myPercentile}th percentile` : "Your school",
              score: overall,
            }}
            footer="Source: ALSDE public report card data via web search"
          />
        </FadeIn>
      </div>

      <FadeIn delay={360}>
        <SectionCard title="Performance Radar" subtitle="School vs county vs state across all dimensions" icon={RadarIcon}>
          <RadarComparison school={school} county={school.county} state={school.state} />
        </SectionCard>
      </FadeIn>
    </div>
  );
}