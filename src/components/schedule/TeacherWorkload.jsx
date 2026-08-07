import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CalendarOff, Target } from "lucide-react";

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
  const breakR = timetable?.break_start && timetable?.break_end ? [toMin(timetable.break_start), toMin(timetable.break_end)] : null;
  const lunchR = timetable?.lunch_start && timetable?.lunch_end ? [toMin(timetable.lunch_start), toMin(timetable.lunch_end)] : null;
  const slots = [];
  for (let s = DAY_START_MIN; s + PERIOD_LENGTH <= DAY_END_MIN; s += PERIOD_LENGTH) {
    const e = s + PERIOD_LENGTH;
    const overlaps = (r) => r && s < r[1] && e > r[0];
    if (overlaps(breakR) || overlaps(lunchR)) continue;
    slots.push([s, e]);
  }
  return slots;
}

export default function TeacherWorkload({ teachers, schedules, timetable, callerCreds }) {
  const slots = useMemo(() => teachingSlots(timetable), [timetable]);
  const periodsPerDay = slots.length;
  const maxPeriods = periodsPerDay * DAYS.length;

  const [targets, setTargets] = useState(() => {
    const map = {};
    teachers.forEach((t) => { map[t.id] = t.target_free_periods ?? ""; });
    return map;
  });
  const [savingId, setSavingId] = useState(null);

  // keep targets in sync when teachers list changes
  useEffect(() => {
    setTargets((prev) => {
      const map = { ...prev };
      teachers.forEach((t) => { if (!(t.id in map)) map[t.id] = t.target_free_periods ?? ""; });
      return map;
    });
  }, [teachers]);

  const rows = useMemo(() => {
    return teachers.map((t) => {
      const perDay = DAYS.map((day) => {
        const dayClasses = schedules.filter((s) => s.teacher_id === t.id && s.day_of_week === day);
        let free = 0;
        for (const [s, e] of slots) {
          const busy = dayClasses.some((c) => {
            const cs = toMin(c.start_time);
            const ce = toMin(c.end_time);
            return cs < e && ce > s;
          });
          if (!busy) free++;
        }
        return free;
      });
      const free = perDay.reduce((a, b) => a + b, 0);
      const teaching = maxPeriods - free;
      return { teacher: t, free, teaching, perDay };
    });
  }, [teachers, schedules, slots, maxPeriods]);

  const saveTarget = async (teacher, value) => {
    const num = value === "" ? null : Number(value);
    setSavingId(teacher.id);
    try {
      await base44.functions.invoke("manageSchoolStaff", {
        action: "update",
        ...callerCreds,
        user_id: teacher.id,
        target_free_periods: num,
      });
      setTargets((prev) => ({ ...prev, [teacher.id]: value }));
      teacher.target_free_periods = num;
    } catch (e) {
      // revert silently
    } finally {
      setSavingId(null);
    }
  };

  if (teachers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <CalendarOff className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-900">Teacher Free Periods</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Set a weekly free-period target per teacher — it splits evenly across {DAYS.length} days. {maxPeriods} teaching periods/week (60-min periods, excluding break &amp; lunch).
      </p>
      <div className="space-y-3">
        {rows.map(({ teacher, free, teaching, perDay }) => {
          const target = targets[teacher.id];
          const targetNum = target === "" || target == null ? null : Number(target);
          const perDayTarget = targetNum != null ? targetNum / DAYS.length : null;
          const meetsTarget = targetNum != null ? free >= targetNum : null;
          const evenness = perDayTarget != null ? Math.max(...perDay) - Math.min(...perDay) : null;
          return (
            <div key={teacher.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <div className="w-36 shrink-0 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{teacher.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{teacher.subject || "—"}</p>
                </div>
                <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="h-full bg-emerald-100" style={{ width: `${maxPeriods > 0 ? Math.round((free / maxPeriods) * 100) : 0}%` }} />
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-[11px] font-semibold text-slate-600">{teaching} teaching · {free} free</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    max={maxPeriods}
                    value={targets[teacher.id] ?? ""}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [teacher.id]: e.target.value }))}
                    onBlur={(e) => saveTarget(teacher, e.target.value)}
                    disabled={savingId === teacher.id}
                    placeholder="—"
                    className="w-14 text-xs text-center rounded-md border border-slate-200 px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    title="Target free periods per week"
                  />
                  <span className="text-[10px] text-slate-400">/wk</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {perDay.map((f, i) => {
                  const below = perDayTarget != null && f < Math.floor(perDayTarget);
                  const ok = perDayTarget != null && f >= perDayTarget;
                  return (
                    <div key={DAYS[i]} className={`flex-1 rounded-md px-1.5 py-1 text-center ${below ? "bg-rose-50 text-rose-600" : ok ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`} title={`${DAYS[i]}: ${f} free${perDayTarget != null ? ` · target ≈${perDayTarget.toFixed(1)}` : ""}`}>
                      <p className="text-[9px] font-medium">{DAYS[i].slice(0, 1)}</p>
                      <p className="text-[11px] font-semibold leading-tight">{f}</p>
                    </div>
                  );
                })}
                {perDayTarget != null && (
                  <div className="pl-2 text-[10px] text-slate-400 shrink-0">
                    ≈{perDayTarget.toFixed(1)}/day
                    {meetsTarget === false && <span className="block text-rose-500 font-medium">below target</span>}
                    {meetsTarget && evenness > 1 && <span className="block text-amber-500 font-medium">uneven split</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400">
        <Clock className="w-3 h-3" />
        Free periods = teaching slots with no scheduled class. Green = meets per-day target, red = below.
      </div>
    </div>
  );
}