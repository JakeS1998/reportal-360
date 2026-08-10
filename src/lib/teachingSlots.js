const toMin = (time) => { const [hours, minutes] = (time || "00:00").split(":"); return Number(hours) * 60 + Number(minutes); };
const pad = (value) => String(value).padStart(2, "0");
export const mmToHHMM = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const formatTime = (time) => { const [hours, minutes] = time.split(":"); const value = Number(hours); return `${value % 12 || 12}:${minutes} ${value >= 12 ? "PM" : "AM"}`; };

const blocksFor = (timetable) => [
  [timetable?.homeroom_start, timetable?.homeroom_end],
  [timetable?.break_start, timetable?.break_end],
  [timetable?.lunch_start, timetable?.lunch_end],
].filter(([start, end]) => start && end).map(([start, end]) => [toMin(start), toMin(end)]).sort((a, b) => a[0] - b[0]);

export const suggestPeriodTimes = (timetable) => {
  const start = toMin(timetable.school_start);
  const end = toMin(timetable.school_end);
  const count = Math.max(1, Number(timetable.period_count) || 1);
  const blocks = blocksFor(timetable);
  const available = end - start - blocks.reduce((total, [blockStart, blockEnd]) => total + Math.max(0, Math.min(end, blockEnd) - Math.max(start, blockStart)), 0);
  const duration = Math.max(5, Math.floor((available / count) / 5) * 5);
  const periods = [];
  let cursor = start;
  while (periods.length < count && cursor < end) {
    const block = blocks.find(([blockStart, blockEnd]) => cursor < blockEnd && cursor + duration > blockStart);
    if (block) { cursor = cursor < block[0] ? block[1] : block[1]; continue; }
    const periodEnd = cursor + duration;
    if (periodEnd > end) break;
    periods.push({ label: `Period ${periods.length + 1}`, start: mmToHHMM(cursor), end: mmToHHMM(periodEnd) });
    cursor = periodEnd;
  }
  return periods;
};

export const buildTeachingSlots = (timetable) => {
  if (timetable?.periods?.length) return timetable.periods.map((period, index) => ({ start: toMin(period.start), end: toMin(period.end), label: period.label || `Period ${index + 1} · ${formatTime(period.start)}–${formatTime(period.end)}` }));
  const fallback = { school_start: timetable?.school_start || "08:00", school_end: timetable?.school_end || "15:00", period_count: timetable?.period_count || 7, ...timetable };
  return suggestPeriodTimes(fallback).map((period, index) => ({ start: toMin(period.start), end: toMin(period.end), label: period.label || `Period ${index + 1} · ${formatTime(period.start)}–${formatTime(period.end)}` }));
};