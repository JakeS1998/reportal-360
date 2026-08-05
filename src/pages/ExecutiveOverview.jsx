import React, { useEffect, useRef, useState } from "react";
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
import AiInsightColumns from "@/components/AiInsightColumns";
import { useAiSummary } from "@/lib/useAiSummary";
import { computeOverallScore } from "@/lib/schoolUtils";
import { Trophy, Crown, Radar as RadarIcon, Users, GraduationCap, Gauge, Sparkles } from "lucide-react";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import LeaderboardCard from "@/components/LeaderboardCard";
import RadarComparison from "@/components/RadarComparison";
import SectionHeader from "@/components/SectionHeader";
import ExportPdfButton from "@/components/ExportPdfButton";
import { exportDashboardPdf } from "@/lib/exportPdf";

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
  const chronicRate = metrics.total ? Math.round((metrics.chronic / metrics.total) * 1000) / 10 : null;
  const { ai, aiLoading } = useAiSummary({ school: activeSchool, overall: activeOverall, subject: filters.subject });
  const contentRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const schoolName = (activeSchool?.school_name || "School").replace(/[^a-zA-Z0-9]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      await exportDashboardPdf(contentRef.current, `${schoolName}-performance-report-${date}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setExporting(false);
    }
  };

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

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <ExportPdfButton onClick={handleExport} loading={exporting} />
      </div>
      <div ref={contentRef} className="space-y-8">
      <FadeIn>
        <SchoolHero school={activeSchool} />
      </FadeIn>

      {/* Academic Performance */}
      <SectionHeader title="Academic Performance" subtitle="Proficiency and engagement metrics from the 2026 student roster" icon={GraduationCap} />

      <FadeIn delay={40}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Math Proficiency" value={metrics.proficiency.math} previous={metrics.prev?.proficiency.math} accent="#1D4ED8" year="2026" tooltip="Average math score across all students in the 2026 roster. Trend compares against the previous year." onClick={() => navigate("/academics")} />
          <KpiCard label="Reading Proficiency" value={metrics.proficiency.reading} previous={metrics.prev?.proficiency.reading} accent="#7C3AED" year="2026" tooltip="Average reading score across all students in the 2026 roster. Trend compares against the previous year." onClick={() => navigate("/academics")} />
          <KpiCard label="Chronic Absenteeism" value={chronicRate} previous={metrics.prev?.chronicRate} suffix="%" lowerIsBetter accent="#F59E0B" year="2026" tooltip="Percentage of students with attendance below 90% (missing 15+ school days). Lower values are better." onClick={() => navigate("/attendance")} />
          <KpiCard label="Avg Attendance" value={metrics.avgAttendance} previous={metrics.prev?.avgAttendance} suffix="%" accent="#10B981" year="2026" tooltip="Average daily attendance rate across all students in the 2026 roster." onClick={() => navigate("/attendance")} />
        </div>
      </FadeIn>

      <FadeIn delay={80}>
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

      <FadeIn delay={120}>
        <BenchmarkTable school={activeSchoolWithScore} county={activeSchool.county} state={activeSchool.state} subject={filters.subject} />
      </FadeIn>

      {/* Accountability */}
      <SectionHeader title="Accountability" subtitle="Weighted contribution to the overall school score" icon={Gauge} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={140} className="relative z-30">
          <AccountabilityBar school={activeSchool} />
        </FadeIn>
        <FadeIn delay={180}>
          <AiExecutiveSummary ai={ai} loading={aiLoading} />
        </FadeIn>
      </div>

      {/* AI Insights */}
      <SectionHeader title="AI Insights" subtitle="Automated analysis and actionable recommendations" icon={Sparkles} />

      <FadeIn delay={200}>
        <QuickInsightCards school={activeSchool} subject={filters.subject} />
      </FadeIn>

      <FadeIn delay={220}>
        <AiInsightColumns ai={ai} loading={aiLoading} />
      </FadeIn>

      {/* Rankings & Comparisons */}
      <SectionHeader title="Rankings & Comparisons" subtitle="Performance relative to peer schools and benchmarks" icon={Trophy} />

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
    </div>
  );
}