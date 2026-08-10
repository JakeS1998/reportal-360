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
  const segments = [];
  let cursor = start;
  blocks.forEach(([blockStart, blockEnd]) => {
    const blockedStart = Math.max(start, blockStart);
    const blockedEnd = Math.min(end, blockEnd);
    if (blockedStart > cursor) segments.push({ start: cursor, end: blockedStart, duration: blockedStart - cursor });
    cursor = Math.max(cursor, blockedEnd);
  });
  if (cursor < end) segments.push({ start: cursor, end, duration: end - cursor });
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
  if (!segments.length || count > totalDuration / 5) return [];
  const allocations = segments.map((segment) => Math.floor((segment.duration / totalDuration) * count));
  while (allocations.reduce((sum, value) => sum + value, 0) < count) {
    const index = segments.map((segment, itemIndex) => (segment.duration / totalDuration) * count - allocations[itemIndex]).reduce((best, value, itemIndex, values) => value > values[best] ? itemIndex : best, 0);
    allocations[index] += 1;
  }
  const periods = [];
  segments.forEach((segment, segmentIndex) => {
    const periodCount = allocations[segmentIndex];
    for (let index = 0; index < periodCount; index += 1) {
      const periodStart = Math.round(segment.start + (segment.duration * index) / periodCount);
      const periodEnd = Math.round(segment.start + (segment.duration * (index + 1)) / periodCount);
      periods.push({ label: `Period ${periods.length + 1}`, start: mmToHHMM(periodStart), end: mmToHHMM(periodEnd) });
    }
  });
  return periods;
};

export const buildTeachingSlots = (timetable) => {
  if (timetable?.periods?.length) return timetable.periods.map((period, index) => ({ start: toMin(period.start), end: toMin(period.end), label: period.label || `Period ${index + 1} · ${formatTime(period.start)}–${formatTime(period.end)}` }));
  const fallback = { school_start: timetable?.school_start || "08:00", school_end: timetable?.school_end || "15:00", period_count: timetable?.period_count || 7, ...timetable };
  return suggestPeriodTimes(fallback).map((period, index) => ({ start: toMin(period.start), end: toMin(period.end), label: period.label || `Period ${index + 1} · ${formatTime(period.start)}–${formatTime(period.end)}` }));
};