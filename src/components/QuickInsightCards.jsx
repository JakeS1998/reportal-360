import React from "react";
import { TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function QuickInsightCards({ school }) {
  const insights = computeInsights(school);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <InsightCard icon={TrendingUp} label="Top Strength" value={insights.strength.text} accent="#10B981" bg="#ECFDF5" />
      <InsightCard icon={AlertTriangle} label="Largest Risk" value={insights.risk.text} accent="#EF4444" bg="#FEF2F2" />
      <InsightCard icon={ArrowUpRight} label="Biggest Improvement" value={insights.improvement.text} accent="#7C3AED" bg="#F5F3FF" />
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, accent, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed font-medium">{value}</p>
    </div>
  );
}

function computeInsights(school) {
  const p = school.previous || {};
  const c = school.county || {};
  const s = school.state || {};

  const benchmarks = [
    { label: "Academic Achievement", school: school.academic_achievement, county: c.academic_achievement, state: s.academic_achievement },
    { label: "Academic Growth", school: school.academic_growth, county: c.academic_growth, state: s.academic_growth },
    { label: "Math Proficiency", school: school.math_proficiency, county: c.math_proficiency, state: s.math_proficiency, suffix: "%" },
    { label: "Reading Proficiency", school: school.reading_proficiency, county: c.reading_proficiency, state: s.reading_proficiency, suffix: "%" },
    { label: "Science Proficiency", school: school.science_proficiency, county: c.science_proficiency, state: s.science_proficiency, suffix: "%" },
    { label: "Graduation Rate", school: school.graduation_rate, county: c.graduation_rate, state: s.graduation_rate, suffix: "%" },
  ].filter((b) => b.school != null && b.county != null);

  let strength = { text: "No benchmark data available." };
  if (benchmarks.length) {
    const best = benchmarks.reduce((a, b) => (b.school - b.county > a.school - a.county ? b : a));
    const delta = (best.school - best.county).toFixed(1);
    strength = { text: `${best.label} exceeds the county average by ${delta}${best.suffix || ""}.` };
  }

  let risk = { text: "No risk metrics available." };
  if (school.chronic_absenteeism != null && c.chronic_absenteeism != null && school.chronic_absenteeism > c.chronic_absenteeism) {
    const delta = (school.chronic_absenteeism - c.chronic_absenteeism).toFixed(1);
    risk = { text: `Chronic absenteeism is ${delta}% above the county average.` };
  } else if (benchmarks.length) {
    const worst = benchmarks.reduce((a, b) => (b.school - b.county < a.school - a.county ? b : a));
    const delta = (worst.county - worst.school).toFixed(1);
    risk = { text: `${worst.label} is ${delta}${worst.suffix || ""} below the county average.` };
  }

  const yoy = [
    { label: "Academic Achievement", current: school.academic_achievement, previous: p.academic_achievement },
    { label: "Academic Growth", current: school.academic_growth, previous: p.academic_growth },
    { label: "Math Proficiency", current: school.math_proficiency, previous: p.math_proficiency },
    { label: "Reading Proficiency", current: school.reading_proficiency, previous: p.reading_proficiency },
    { label: "Science Proficiency", current: school.science_proficiency, previous: p.science_proficiency },
    { label: "Graduation Rate", current: school.graduation_rate, previous: p.graduation_rate },
  ].filter((y) => y.current != null && y.previous != null);

  let improvement = { text: "No year-over-year data available." };
  if (yoy.length) {
    const best = yoy.reduce((a, b) => {
      const da = a.current - a.previous;
      const db = b.current - b.previous;
      return db > da ? b : a;
    });
    const delta = (best.current - best.previous).toFixed(1);
    if (parseFloat(delta) > 0) {
      improvement = { text: `${best.label} improved by ${delta} points since last year.` };
    } else {
      improvement = { text: `${best.label} changed by ${delta} points since last year.` };
    }
  }

  return { strength, risk, improvement };
}