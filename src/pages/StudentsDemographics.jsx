import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { Users, TrendingUp, UserPlus, UserMinus } from "lucide-react";

const RACE_COLORS = {
  White: "#6366f1",
  Black: "#0ea5e9",
  Hispanic: "#f59e0b",
  Asian: "#10b981",
  "Two or more": "#8b5cf6",
  "American Indian": "#ec4899",
  "Native Hawaiian": "#14b8a6",
};

export default function StudentsDemographics() {
  const { activeSchool, loading } = useSchool();
  const metrics = useStudentMetrics();

  if (loading || !activeSchool) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }

  const school = activeSchool;
  const p = school.previous || {};
  const growth = school.enrollment != null && p.enrollment != null ? Math.round(((school.enrollment - p.enrollment) / p.enrollment) * 1000) / 10 : null;
  const gained = school.enrollment != null && p.enrollment != null ? school.enrollment - p.enrollment : null;
  const race = metrics.race;
  const subgroups = metrics.subgroups;
  const econDis = subgroups.find((sg) => sg.label === "Economically Disadvantaged");
  const freeMealsCount = econDis ? econDis.count : null;
  const freeMealsPct = freeMealsCount != null && metrics.total ? Math.round((freeMealsCount / metrics.total) * 1000) / 10 : null;

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Current Enrollment" value={school.enrollment} previous={p.enrollment} accent="#1D4ED8" year={school.year} />
          <KpiCard label="YoY Growth" value={growth} suffix="%" accent={growth >= 0 ? "#10B981" : "#EF4444"} year={school.year} />
          <KpiCard label="Net Population Change" value={gained ?? null} signed accent={gained >= 0 ? "#10B981" : "#EF4444"} year={school.year} tooltip="Net change in enrollment compared to the previous report year." />
          <KpiCard label="Free & Reduced Meals" value={freeMealsCount} previous={metrics.prev?.econDisadvantaged} suffix={freeMealsPct != null ? ` (${freeMealsPct}%)` : ""} accent="#F59E0B" year={school.year} tooltip={`Students eligible for free or reduced-price meals (Economically Disadvantaged)${freeMealsPct != null ? ` — ${freeMealsPct}% of roster` : ""}`} />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={60}>
          <SectionCard title="Race & Ethnicity" subtitle={`Distribution across ${metrics.total} students (2026 roster)`} icon={Users}>
            <div className="space-y-3">
              {race.length ? (
                race.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{d.label}</span>
                      <span className="font-semibold text-slate-900">{d.percent != null ? `${d.percent}%` : "< 1%"} <span className="text-slate-400 font-normal">({d.count})</span></span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.percent}%`, backgroundColor: RACE_COLORS[d.label] || "#64748b" }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No student data available.</p>
              )}
            </div>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionCard title="Population Breakdown" subtitle="Student subgroup counts (2026 roster)" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-3">
              {subgroups.map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{s.count}</p>
                  <p className="text-[11px] text-slate-400">{metrics.total ? Math.round((s.count / metrics.total) * 100) : 0}% of roster</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </FadeIn>
      </div>

      <FadeIn delay={180}>
        <SectionCard title="Enrollment Trend" subtitle="Year-over-year change" icon={UserPlus}>
          <div className="flex items-end gap-8">
            <div>
              <p className="text-xs text-slate-500">Previous Year</p>
              <p className="text-3xl font-bold text-slate-400">{p.enrollment ?? "—"}</p>
            </div>
            <div className="flex flex-col items-center">
              {gained != null ? (
                gained >= 0 ? <UserPlus className="w-6 h-6 text-emerald-500" /> : <UserMinus className="w-6 h-6 text-rose-500" />
              ) : null}
              <span className={`text-sm font-semibold mt-1 ${gained >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {gained != null ? `${gained >= 0 ? "+" : ""}${gained}` : "—"}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Year</p>
              <p className="text-3xl font-bold text-slate-900">{school.enrollment ?? "—"}</p>
            </div>
          </div>
        </SectionCard>
      </FadeIn>
    </div>
  );
}