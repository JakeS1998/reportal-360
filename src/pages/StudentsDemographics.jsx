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
  Hispanic: "#f97316",
};

export default function StudentsDemographics() {
  const { school, loading } = useSchool();

  if (loading || !school) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const p = school.previous || {};
  const growth = school.enrollment != null && p.enrollment != null ? Math.round(((school.enrollment - p.enrollment) / p.enrollment) * 1000) / 10 : null;
  const gained = school.enrollment != null && p.enrollment != null ? school.enrollment - p.enrollment : null;
  const race = (school.demographics_race || []).filter((d) => d.percent != null);
  const subgroups = school.demographics_subgroups || [];

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Current Enrollment" value={school.enrollment} previous={p.enrollment} accent="#1D4ED8" />
          <KpiCard label="YoY Growth" value={growth} suffix="%" accent={growth >= 0 ? "#10B981" : "#EF4444"} />
          <KpiCard label="Students Gained" value={gained >= 0 ? gained : 0} accent="#10B981" />
          <KpiCard label="Students Lost" value={gained < 0 ? Math.abs(gained) : 0} accent="#EF4444" />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={60}>
          <SectionCard title="Race & Ethnicity" subtitle="Share of enrollment" icon={Users}>
            <div className="space-y-3">
              {race.length ? (
                race.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{d.label}</span>
                      <span className="font-semibold text-slate-900">{d.percent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.percent}%`, backgroundColor: RACE_COLORS[d.label] || "#64748b" }} />
                    </div>
                  </div>
                ))
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