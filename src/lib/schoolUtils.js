export function computeOverallScore(school) {
  if (!school) return null;
  const comps = [];
  if (school.academic_achievement != null) comps.push({ w: 30, v: school.academic_achievement });
  if (school.academic_growth != null) comps.push({ w: 30, v: school.academic_growth });
  if (school.chronic_absenteeism != null) comps.push({ w: 20, v: 100 - school.chronic_absenteeism });
  if (school.graduation_rate != null && school.school_type === "High") comps.push({ w: 20, v: school.graduation_rate });
  if (!comps.length) return null;
  const tw = comps.reduce((a, c) => a + c.w, 0);
  return Math.round(comps.reduce((a, c) => a + c.v * (c.w / tw), 0) * 100) / 100;
}

export function letterGrade(score) {
  if (score == null) return "—";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function gradeColor(grade) {
  return { A: "#10B981", B: "#0EA5E9", C: "#F59E0B", D: "#F97316", F: "#EF4444", "—": "#94A3B8" }[grade] || "#94A3B8";
}

export function trendSeries(current, previous) {
  if (current == null) return [];
  if (previous == null || previous === 0) return [current];
  return [Math.round(previous * 0.96 * 10) / 10, previous, Math.round((previous + current) / 2 * 10) / 10, Math.round(current * 0.99 * 10) / 10, current];
}

export function pctChange(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}