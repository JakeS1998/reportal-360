import { buildTeachingSlots } from "@/lib/teachingSlots";

export const DEFAULT_SCHOOL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function getSchoolDays(timetable) {
  return timetable?.school_days?.length ? timetable.school_days : DEFAULT_SCHOOL_DAYS;
}

export function buildScheduleSlots(timetable) {
  const model = timetable?.scheduling_model || "traditional";
  if (model === "flexible_weekly") {
    return (timetable?.flexible_slots || []).map((slot, index) => ({
      day_of_week: slot.day_of_week,
      start: Number(slot.start?.split(":")[0]) * 60 + Number(slot.start?.split(":")[1]),
      end: Number(slot.end?.split(":")[0]) * 60 + Number(slot.end?.split(":")[1]),
      label: slot.label || `Slot ${index + 1}`,
      day_type: "",
    })).filter((slot) => slot.day_of_week && Number.isFinite(slot.start) && slot.end > slot.start);
  }
  const periods = buildTeachingSlots(timetable);
  if (model === "rotating_block") {
    const dayTypes = timetable?.cycle_day_types?.length ? timetable.cycle_day_types : ["A", "B"];
    return dayTypes.flatMap((dayType) => periods.map((period) => ({ ...period, day_of_week: dayType, day_type: dayType })));
  }
  return getSchoolDays(timetable).flatMap((day) => periods.map((period) => ({ ...period, day_of_week: day, day_type: "" })));
}

export function scheduleModelLabel(model) {
  return { traditional: "Traditional Period", rotating_block: "Rotating Block", flexible_weekly: "Flexible Weekly" }[model || "traditional"];
}

export function getCycleDayType(date, timetable) {
  const dayTypes = timetable?.cycle_day_types?.length ? timetable.cycle_day_types : ["A", "B"];
  const start = new Date(`${timetable?.cycle_start_date || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const current = new Date(date); current.setHours(0, 0, 0, 0);
  const days = Math.floor((current - start) / 86400000);
  return dayTypes[((days % dayTypes.length) + dayTypes.length) % dayTypes.length];
}