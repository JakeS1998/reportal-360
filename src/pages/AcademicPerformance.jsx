import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import SubjectProficiencyChart from "@/components/SubjectProficiencyChart";
import SubgroupMatrix from "@/components/SubgroupMatrix";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { GraduationCap, Trophy, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function AcademicPerformance() {
  const { school, activeSchool, loading, filters } = useSchool();
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    if (!school || !school.math_proficiency) return;
    setAiLoading(true);
    const p = school.previous || {};
    const c = school.county || {};
    const s = school.state || {};
    const prompt = `You are an Alabama education analytics assistant. Given this school's proficiency data, estimate (a) proficiency by grade level for each subject, (b) a subgroup proficiency matrix, and (c) subject rankings with year-over-year movement.

School: ${school.school_name} (${school.school_type}, FY ${school.year})
Current proficiency — Math: ${school.math_proficiency}%, Reading: ${school.reading_proficiency}%, Science: ${school.science_proficiency}%
Previous — Math: ${p.math_proficiency ?? "—"}%, Reading: ${p.reading_proficiency ?? "—"}%, Science: ${p.science_proficiency ?? "—"}%
County — Math: ${c.math_proficiency ?? "—"}%, Reading: ${c.reading_proficiency ?? "—"}%, Science: ${c.science_proficiency ?? "—"}%
State — Math: ${s.math_proficiency ?? "—"}%, Reading: ${s.reading_proficiency ?? "—"}%, Science: ${s.science_proficiency ?? "—"}%

For grade levels use: ${school.school_type === "High" ? "Grade 9, 10, 11, 12" : school.school_type === "Middle" ? "Grade 6, 7, 8" : "Grade 3, 4, 5"}.
Subgroups: All Students, Economically Disadvantaged, Non-Economically Disadvantaged, Students with Disabilities, English Learners, General Education, Male, Female.
Columns for subgroups: math, reading, science, growth, attendance (each a proficiency-style 0-100 number).

Return JSON: {
  "gradeBreakdown": [ {"grade":"Grade 3","math":number,"reading":number,"science":number}, ... ],
  "subgroups": [ {"name":"All Students","math":number,"reading":number,"science":number,"growth":number,"attendance":number}, ... ],
  "rankings": [ {"rank":1,"subject":"Reading","value":number,"movement":"up|down|same"}, ... ]
}`;
    base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          gradeBreakdown: { type: "array" },
          subgroups: { type: "array" },
          rankings: { type: "array" },
        },
        required: ["gradeBreakdown", "subgroups", "rankings"],
      },
    })
      .then(setAi)
      .catch(() => setAi(null))
      .finally(() => setAiLoading(false));
  }, [school]);

  if (loading || !activeSchool) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  }

  const s = activeSchool;
  const gradeData = (ai?.gradeBreakdown || [])
    .filter((g) => filters.grade === "All Grades" || g.grade === filters.grade)
    .map((g) => ({ grade: g.grade, Math: g.math, Reading: g.reading, Science: g.science }));
  const showSubject = (sub) => filters.subject === "All Subjects" || filters.subject === sub;
  const rankings = filters.subject !== "All Subjects" ? (ai?.rankings || []).filter((r) => r.subject === filters.subject) : (ai?.rankings || []);

  return (
    <div className="space-y-8">
      <FadeIn>
        <SectionCard title="Subject Proficiency" subtitle="Current vs previous year, county, and state with 80% target" icon={GraduationCap}>
          <SubjectProficiencyChart school={s} county={s.county} state={s.state} subject={filters.subject} />
        </SectionCard>
      </FadeIn>

      <FadeIn delay={60}>
        <SectionCard title="Grade-Level Breakdown" subtitle="Proficiency by grade (modeled estimates)" icon={Layers}>
          {aiLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : gradeData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeData} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => (v != null ? `${v}%` : "—")} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={80} stroke="#F97316" strokeDasharray="5 4" />
                {showSubject("Math") && <Bar dataKey="Math" fill="#1D4ED8" radius={[4, 4, 0, 0]} />}
                {showSubject("Reading") && <Bar dataKey="Reading" fill="#7C3AED" radius={[4, 4, 0, 0]} />}
                {showSubject("Science") && <Bar dataKey="Science" fill="#10B981" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">Grade breakdown unavailable.</p>
          )}
        </SectionCard>
      </FadeIn>

      <FadeIn delay={120}>
        <SubgroupMatrix data={ai?.subgroups} studentGroup={filters.studentGroup} gender={filters.gender} />
      </FadeIn>

      <FadeIn delay={180}>
        <SectionCard title="Subject Rankings" subtitle="Ordered by current proficiency with year-over-year movement" icon={Trophy}>
          {aiLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rankings.length ? (
            <div className="space-y-2">
              {rankings.map((r) => (
                <div key={r.subject} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#1D4ED8] text-white text-sm font-bold flex items-center justify-center">{r.rank}</span>
                    <span className="font-semibold text-slate-800">{r.subject}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">{r.value}%</span>
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
            <p className="text-sm text-slate-400">Rankings unavailable.</p>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}