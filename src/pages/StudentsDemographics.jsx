import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { Users, TrendingUp, UserPlus, UserMinus } from "lucide-react";

const RACE_COLORS = {
  White: "#6366f1",
  "Black or African American": "#0ea5e9",
  Asian: "#10b981",
  "American Indian / Alaska Native": "#f59e0b",
  "Native Hawaiian / Pacific Islander": "#ec4899",
  "Two or more races": "#8b5cf6",
};

export default function StudentsDemographics() {
  const { activeSchool, loading, filters } = useSchool();

  if (loading || !activeSchool) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }

  const school = activeSchool;
  const p = school.previous || {};
  const growth = school.enrollment != null && p.enrollment != null ? Math.round(((school.enrollment - p.enrollment) / p.enrollment) * 1000) / 10 : null;
  const gained = school.enrollment != null && p.enrollment != null ? school.enrollment - p.enrollment : null;
  const race = school.demographics_race || [];
  const allSubgroups = school.demographics_subgroups || [];
  const subgroups = filters.studentGroup !== "All Students" ? allSubgroups.filter((sg) => sg.label === filters.studentGroup) : allSubgroups;
  const econDis = allSubgroups.find((sg) => sg.label === "Economically Disadvantaged");
  const freeMealsCount = econDis ? econDis.count : null;
  const freeMealsPct = freeMealsCount != null && school.enrollment ? Math.round((freeMealsCount / school.enrollment) * 1000) / 10 : null;

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Current Enrollment" value={school.enrollment} previous={p.enrollment} accent="#1D4ED8" year={school.year} />
          <KpiCard label="YoY Growth" value={growth} suffix="%" accent={growth >= 0 ? "#10B981" : "#EF4444"} year={school.year} />
          <KpiCard label="Net Population Change" value={gained != null ? (gained >= 0 ? `+${gained}` : `${gained}`) : null} accent={gained >= 0 ? "#10B981" : "#EF4444"} year={school.year} tooltip="Net change in enrollment compared to the previous report year." />
          <KpiCard label="Free & Reduced Meals" value={freeMealsCount} suffix={freeMealsPct != null ? ` (${freeMealsPct}%)` : ""} accent="#F59E0B" year={school.year} tooltip={`Students eligible for free or reduced-price meals (Economically Disadvantaged)${freeMealsPct != null ? ` — ${freeMealsPct}% of enrollment` : ""}`} />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={60}>
          <SectionCard title="Race & Ethnicity" subtitle="Share of enrollment" icon={Users}>
            <div className="space-y-3">
              {race.length ? (
                race.map((d) => {
                  const pct = d.percent != null ? d.percent : 0;
                  return (
                    <div key={d.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">{d.label}</span>
                        <span className="font-semibold text-slate-900">{d.percent != null ? `${pct}%` : "< 1%"}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: RACE_COLORS[d.label] || "#64748b" }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">Race data unavailable.</p>
              )}
            </div>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionCard title="Population Breakdown" subtitle="Student subgroup counts" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-3">
              {subgroups.length ? (
                subgroups.map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{(s.count || 0).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">{school.enrollment ? Math.round(((s.count || 0) / school.enrollment) * 100) : 0}% of enrollment</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 col-span-2">Subgroup data unavailable.</p>
              )}
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