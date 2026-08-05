import React from "react";
import { computeOverallScore, letterGrade, gradeColor } from "@/lib/schoolUtils";
import InfoTooltip from "./InfoTooltip";
import { useCountUp } from "@/hooks/useCountUp";
import { TrendingUp, TrendingDown } from "lucide-react";

const CATEGORY_COLORS = {
  achievement: "#1D4ED8",
  growth: "#7C3AED",
  attendance: "#F59E0B",
  graduation: "#10B981",
};

export default function SchoolHero({ school }) {
  const overall = computeOverallScore(school);
  const prevOverall = school?.previous ? computeOverallScore(school.previous) : null;
  const grade = letterGrade(overall);
  const prevGrade = letterGrade(prevOverall);
  const animatedScore = useCountUp(overall, 1000);
  const hasDelta = prevOverall != null && overall != null;
  const diff = hasDelta ? overall - prevOverall : null;
  const positive = diff != null ? diff > 0 : null;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm p-7 hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-bold shadow-md shrink-0" style={{ backgroundColor: gradeColor(grade) + "15", color: gradeColor(grade) }}>
            {grade}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              Overall School Score
              <InfoTooltip text="Composite score combining academic achievement, growth, attendance, and graduation metrics into a single 0–100 value." />
            </p>
            <p className="text-5xl font-bold text-slate-900 leading-none mt-1.5 tabular-nums">
              {overall != null ? animatedScore.toFixed(1) : "—"}
            </p>
            <div className="flex items-center gap-3 mt-2.5">
              {hasDelta && diff != null ? (
                <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)} pts
                </span>
              ) : null}
              <span className="text-sm text-slate-400">
                Previous: <span className="font-semibold" style={{ color: gradeColor(prevGrade) }}>{prevGrade}</span>
                {prevOverall != null ? ` (${prevOverall.toFixed(1)})` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            <HeroMetric label="Achievement" value={school.academic_achievement} color={CATEGORY_COLORS.achievement} />
            <HeroMetric label="Growth" value={school.academic_growth} color={CATEGORY_COLORS.growth} />
            <HeroMetric label="Absenteeism" value={school.chronic_absenteeism} suffix="%" color={CATEGORY_COLORS.attendance} />
            <HeroMetric label="Graduation" value={school.graduation_rate} suffix="%" color={CATEGORY_COLORS.graduation} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, suffix, color }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold mt-0.5" style={{ color }}>{value != null ? `${value}${suffix || ""}` : "—"}</p>
    </div>
  );
}