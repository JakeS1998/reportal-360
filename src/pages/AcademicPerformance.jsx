import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import SectionCard from "@/components/SectionCard";
import SubjectProficiencyChart from "@/components/SubjectProficiencyChart";
import SubgroupMatrix from "@/components/SubgroupMatrix";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { GraduationCap, Trophy, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function AcademicPerformance() {
  const { activeSchool, loading, filters } = useSchool();
  const metrics = useStudentMetrics();

  if (loading || !activeSchool) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  }

  const s = activeSchool;
  const gradeData = metrics.gradeBreakdown.filter((g) => filters.grade === "All Grades" || g.grade === filters.grade);
  const showSubject = (sub) => filters.subject === "All Subjects" || filters.subject === sub;
  const rankings = filters.subject !== "All Subjects" ? metrics.rankings.filter((r) => r.subject === filters.subject) : metrics.rankings;

  return (
    <div className="space-y-8">
      <FadeIn>
        <SectionCard title="Subject Proficiency" subtitle="Current vs previous year, county, and state with 80% target" icon={GraduationCap}>
          <SubjectProficiencyChart school={s} county={s.county} state={s.state} subject={filters.subject} />
        </SectionCard>
      </FadeIn>

      <FadeIn delay={60}>
        <SectionCard title="Grade-Level Breakdown" subtitle={`Average scores by grade (2026 student roster · ${metrics.total} students)`} icon={Layers}>
          {gradeData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeData} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => (v != null ? `${v}` : "—")} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={80} stroke="#F97316" strokeDasharray="5 4" />
                {showSubject("Math") && <Bar dataKey="Math" fill="#1D4ED8" radius={[4, 4, 0, 0]} />}
                {showSubject("Reading") && <Bar dataKey="Reading" fill="#7C3AED" radius={[4, 4, 0, 0]} />}
                {showSubject("Science") && <Bar dataKey="Science" fill="#10B981" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">No student data for the selected grade.</p>
          )}
        </SectionCard>
      </FadeIn>

      <FadeIn delay={120}>
        <SubgroupMatrix data={metrics.matrixRows} studentGroup={filters.studentGroup} gender={filters.gender} />
      </FadeIn>

      <FadeIn delay={180}>
        <SectionCard title="Subject Rankings" subtitle="Ordered by average score with year-over-year movement" icon={Trophy}>
          {rankings.length ? (
            <div className="space-y-2">
              {rankings.map((r) => (
                <div key={r.subject} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#1D4ED8] text-white text-sm font-bold flex items-center justify-center">{r.rank}</span>
                    <span className="font-semibold text-slate-800">{r.subject}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">{r.value}</span>
                    {r.movement === "up" ? (
                      <span className="text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
                    ) : r.movement === "down" ? (
                      <span className="text-rose-600"><TrendingDown className="w-4 h-4" /></span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No ranking data available.</p>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}