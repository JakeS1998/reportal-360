const DAY_MS = 86400000;

export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function addWeeks(weekStart, n) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + n * 7);
  return d;
}

export function weeksBetween(fromWeek, toWeek) {
  return Math.round((toWeek - fromWeek) / (7 * DAY_MS));
}

export function isScheduleActiveInWeek(s, weekStart) {
  if (!s.start_date) return true; // legacy records: always visible
  const schedWeek = getWeekStart(s.start_date);
  const diff = weeksBetween(schedWeek, weekStart);
  if (diff < 0) return false; // before the schedule starts
  const type = s.recurrence_type || "weekly";
  if (type === "none") return diff === 0;
  if (type === "biweekly") return diff % 2 === 0;
  return true; // weekly
}

export function formatWeekRange(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4); // Friday
  const opts = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

const GRADE_PALETTE = [
  "#9E1B32", "#2563eb", "#059669", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#be185d",
];

export function gradeColor(grade) {
  if (!grade) return "#64748b";
  const g = String(grade).trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < g.length; i++) h = (h * 31 + g.charCodeAt(i)) >>> 0;
  return GRADE_PALETTE[h % GRADE_PALETTE.length];
}

const SUBJECT_PALETTE = [
  "#1D4ED8", "#7C3AED", "#059669", "#D97706", "#DB2777",
  "#0891B2", "#65A30D", "#EA580C", "#4F46E5", "#0D9488",
  "#BE185D", "#9E1B32",
];

export function subjectColor(subject) {
  if (!subject) return "#64748b";
  const s = String(subject).trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}