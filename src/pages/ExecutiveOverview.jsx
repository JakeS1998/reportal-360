import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import AccountabilityBar from "@/components/AccountabilityBar";
import BenchmarkTable from "@/components/BenchmarkTable";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import SchoolHero from "@/components/SchoolHero";
import QuickInsightCards from "@/components/QuickInsightCards";
import AiExecutiveSummary from "@/components/AiExecutiveSummary";
import { computeOverallScore } from "@/lib/schoolUtils";
import { Trophy, Crown, Radar as RadarIcon, Users } from "lucide-react";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import LeaderboardCard from "@/components/LeaderboardCard";
import RadarComparison from "@/components/RadarComparison";

export default function ExecutiveOverview() {
  const { school, activeSchool, loading, filters } = useSchool();
  const metrics = useStudentMetrics();
  const navigate = useNavigate();
  const [countyLb, setCountyLb] = useState({ loading: true });
  const [stateLb, setStateLb] = useState({ loading: true });

  const overall = school ? computeOverallScore(school) : null;
  const schoolWithScore = school ? { ...school, _overall: overall } : null;
  const activeOverall = activeSchool ? computeOverallScore(activeSchool) : null;
  const activeSchoolWithScore = activeSchool ? { ...activeSchool, _overall: activeOverall } : null;
  const prevOverall = school?.previous ? computeOverallScore(school.previous) : null;

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

  if (loading || !activeSchool) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const p = activeSchool.previous || {};

  return (
    <div className="space-y-8">
      <FadeIn>
        <SchoolHero school={activeSchool} />
      </FadeIn>

      <FadeIn delay={40}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Academic Achievement" value={activeSchool.academic_achievement} previous={p.academic_achievement} accent="#1D4ED8" year={activeSchool.year} tooltip="ALSDE Academic Achievement indicator — measures proficiency on state assessments (ACAP/ACT)." onClick={() => navigate("/academics")} />
          <KpiCard label="Academic Growth" value={activeSchool.academic_growth} previous={p.academic_growth} accent="#7C3AED" year={activeSchool.year} tooltip="ALSDE Academic Growth indicator — measures student academic progress relative to peers over time." onClick={() => navigate("/academics")} />
          <KpiCard label="Chronic Absenteeism" value={activeSchool.chronic_absenteeism} previous={p.chronic_absenteeism} suffix="%" lowerIsBetter accent="#F59E0B" year={activeSchool.year} tooltip="Percentage of students missing 15 or more school days. Lower values are better." onClick={() => navigate("/attendance")} />
          <KpiCard label="Graduation Rate" value={activeSchool.graduation_rate} previous={p.graduation_rate} suffix="%" accent="#10B981" year={activeSchool.year} tooltip="Percentage of students graduating within four years of entering high school." onClick={() => navigate("/academics")} />
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        <QuickInsightCards school={activeSchool} subject={filters.subject} />
      </FadeIn>

      <FadeIn delay={100}>
        <SectionCard title="Student Roster Snapshot" subtitle={`Live metrics from ${metrics.total} students (2026 sample data · updates with filters)`} icon={Users}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">Avg Math Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.proficiency.math ?? "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">Avg Reading Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.proficiency.reading ?? "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">Avg Attendance</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.avgAttendance != null ? `${metrics.avgAttendance}%` : "—"}</p>
            </div>
          </div>
        </SectionCard>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={120}>
          <AccountabilityBar school={activeSchool} />
        </FadeIn>
        <FadeIn delay={160}>
          <AiExecutiveSummary school={activeSchool} overall={activeOverall} subject={filters.subject} />
        </FadeIn>
      </div>

      <FadeIn delay={200}>
        <BenchmarkTable school={activeSchoolWithScore} county={activeSchool.county} state={activeSchool.state} subject={filters.subject} />
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
              prevScore: s.prevScore,
              isMe: s.school_code === school.school_code,
            }))}
            myRank={countyLb.myRank ? `#${countyLb.myRank}` : null}
            myItem={countyLb.mySchool && countyLb.myRank > 5 ? {
              name: countyLb.mySchool.school_name,
              sublabel: "Your school",
              score: countyLb.mySchool.score,
              prevScore: countyLb.mySchool.prevScore,
            } : null}
            footer={countyLb.totalSchools ? `Ranked ${countyLb.totalSchools} schools by Overall School Score · FY 2025` : null}
          />
        </FadeIn>
        <FadeIn delay={280}>
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
              prevScore: prevOverall,
            }}
            footer="Source: ALSDE public report card data via web search"
          />
        </FadeIn>
      </div>

      <FadeIn delay={320}>
        <SectionCard title="Performance Radar" subtitle="School vs county vs state across all dimensions" icon={RadarIcon}>
          <RadarComparison school={activeSchool} county={activeSchool.county} state={activeSchool.state} subject={filters.subject} />
        </SectionCard>
      </FadeIn>
    </div>
  );
}