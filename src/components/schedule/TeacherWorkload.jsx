import React, { useMemo } from "react";
import { Clock, CalendarOff } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 16 * 60;
const PERIOD_LENGTH = 60;

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

function teachingSlots(timetable) {
  const breakR = timetable?.break_start ? [toMin(timetable.break_start), toMin(timetable.break_end)] : null;
  const lunchR = timetable?.lunch_start ? [toMin(timetable.lunch_start), toMin(timetable.lunch_end)] : null;
  const slots = [];
  for (let s = DAY_START_MIN; s + PERIOD_LENGTH <= DAY_END_MIN; s += PERIOD_LENGTH) {
    const e = s + PERIOD_LENGTH;
    const overlaps = (r) => r && s < r[1] && e > r[0];
    if (overlaps(breakR) || overlaps(lunchR)) continue;
    slots.push([s, e]);
  }
  return slots;
}

export default function TeacherWorkload({ teachers, schedules, timetable }) {
  const { rows, maxPeriods } = useMemo(() => {
    const slots = teachingSlots(timetable);
    const periodsPerDay = slots.length;
    const max = periodsPerDay * DAYS.length;
    const list = teachers.map((t) => {
      let free = 0;
      for (const day of DAYS) {
        const dayClasses = schedules.filter((s) => s.teacher_id === t.id && s.day_of_week === day);
        for (const [s, e] of slots) {
          const busy = dayClasses.some((c) => {
            const cs = toMin(c.start_time);
            const ce = toMin(c.end_time);
            return cs < e && ce > s;
          });
          if (!busy) free++;
        }
      }
      return { teacher: t, free, teaching: max - free };
    });
    return { rows: list, maxPeriods: max };
  }, [teachers, schedules, timetable]);

  if (teachers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarOff className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Teacher Free Periods</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Weekly balance across {DAYS.length} days · {maxPeriods} teaching periods/week (60-min periods, excluding break &amp; lunch).
      </p>
      <div className="space-y-2.5">
        {rows.map(({ teacher, free, teaching }) => {
          const pct = maxPeriods > 0 ? Math.round((free / maxPeriods) * 100) : 0;
          return (
            <div key={teacher.id} className="flex items-center gap-3">
              <div className="w-36 shrink-0 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{teacher.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{teacher.subject || "—"}</p>
              </div>
              <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden relative">
                <div className="h-full bg-emerald-100" style={{ width: `${pct}%` }} />
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-[11px] font-semibold text-slate-600">{teaching} teaching · {free} free</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400">
        <Clock className="w-3 h-3" />
        Free periods = teaching slots with no scheduled class.
      </div>
    </div>
  );
}