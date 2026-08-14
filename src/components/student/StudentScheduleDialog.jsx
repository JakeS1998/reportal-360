import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { getWeekStart, addWeeks, isScheduleActiveInWeek, formatWeekRange } from "@/lib/scheduleWeeks";
import { useSubjectColors } from "@/lib/useSubjectColors";
import PrintableTimetable from "./PrintableTimetable";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 16 * 60;
const PX_PER_MIN = 1.4;
const PX_PER_HOUR = PX_PER_MIN * 60;
const GRID_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(":"); return parseInt(h, 10) * 60 + parseInt(m, 10); };
const pad = (n) => String(n).padStart(2, "0");
const mmToHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const HOURS = [];
for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) HOURS.push(m);

const STATUS_STYLE = {
  present: { bg: "rgba(16,185,129,0.95)", label: "Present", border: "none" },
  late: { bg: "rgba(245,158,11,0.95)", label: "Late", border: "none" },
  absent: { bg: "rgba(244,63,94,0.95)", label: "Absent", border: "none" },
  excused: { bg: "rgba(100,116,139,0.95)", label: "Excused", border: "none" },
  none: { bg: "rgba(255,255,255,0.2)", label: "Not recorded", border: "1px solid rgba(255,255,255,0.5)" },
};

function layoutBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a._startMin - b._startMin);
  const clusters = [];
  let cluster = [];
  let clusterEnd = -1;
  for (const b of sorted) {
    if (cluster.length === 0 || b._startMin < clusterEnd) {
      cluster.push(b);
      clusterEnd = Math.max(clusterEnd, b._endMin);
    } else {
      clusters.push(cluster);
      cluster = [b];
      clusterEnd = b._endMin;
    }
  }
  if (cluster.length) clusters.push(cluster);
  const layout = {};
  for (const cl of clusters) cl.forEach((b, i) => { layout[b.id] = { col: i, count: cl.length }; });
  return layout;
}

const LEGEND = [
  { ...STATUS_STYLE.present },
  { ...STATUS_STYLE.late },
  { ...STATUS_STYLE.absent },
  { ...STATUS_STYLE.excused },
  { ...STATUS_STYLE.none },
];

export default function StudentScheduleDialog({ open, onOpenChange, student, classes, attendance, schoolCode }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { resolveSubjectColor } = useSubjectColors();

  const classIds = useMemo(() => new Set(classes.map((c) => c.id)), [classes]);

  useEffect(() => {
    if (!open || !schoolCode) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const classSchedules = await Promise.all(
          Array.from(classIds).map((classId) => base44.entities.ClassSchedule.filter({ class_id: classId }, "start_time", 100))
        );
        if (active) setSchedules(classSchedules.flat());
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, schoolCode, classIds]);

  const attMap = useMemo(() => {
    const m = {};
    for (const a of attendance) m[`${a.class_id}|${a.date}`] = a.status;
    return m;
  }, [attendance]);

  const hasBiweekly = useMemo(() => schedules.some((s) => s.recurrence_type === "biweekly"), [schedules]);

  const byDay = (day, idx) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return schedules
      .filter((s) => s.day_of_week === day && isScheduleActiveInWeek(s, weekStart))
      .map((s) => ({
        ...s,
        _startMin: toMin(s.start_time),
        _endMin: toMin(s.end_time),
        _status: attMap[`${s.class_id}|${dateStr}`],
      }))
      .filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl print-schedule">
        <DialogHeader className="print:hidden">
          <DialogTitle>Weekly Schedule · {student?.student_name}</DialogTitle>
        </DialogHeader>

        {/* Interactive on-screen view (hidden when printing) */}
        <div className="print:hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>This Week</Button>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
              <span className="text-sm font-semibold text-slate-700 ml-1">{formatWeekRange(weekStart)}</span>
              <Button variant="outline" size="sm" className="ml-2" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {LEGEND.map((i) => (
                <span key={i.label} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: i.bg, border: i.border }} />
                  {i.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="flex">
                  <div className="w-12 shrink-0" />
                  {DAYS.map((day, idx) => {
                    const d = new Date(weekStart); d.setDate(d.getDate() + idx);
                    return (
                      <div key={day} className="flex-1 min-w-[140px] text-center text-xs font-semibold py-2 border-b border-l border-slate-100 text-slate-700">
                        <div>{day}</div>
                        <div className="text-[10px] font-normal text-slate-400">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex">
                  <div className="w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
                    {HOURS.map((m) => (
                      <div key={m} className="absolute left-0 right-0 text-[10px] text-slate-400 -translate-y-1/2 text-right pr-1" style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}>
                        {fmtTime(mmToHHMM(m))}
                      </div>
                    ))}
                  </div>
                  {DAYS.map((day, idx) => {
                    const blocks = byDay(day, idx);
                    const layout = layoutBlocks(blocks);
                    return (
                      <div key={day} className="flex-1 min-w-[140px] border-l border-slate-100">
                        <div className="relative" style={{ height: GRID_HEIGHT, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR}px)` }}>
                          {blocks.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300">—</div>
                          )}
                          {blocks.map((s) => {
                            const lay = layout[s.id] || { col: 0, count: 1 };
                            const top = (s._startMin - DAY_START_MIN) * PX_PER_MIN;
                            const height = Math.max(24, (s._endMin - s._startMin) * PX_PER_MIN - 2);
                            const widthPct = 100 / lay.count;
                            const cls = classes.find((c) => c.id === s.class_id);
                            const bg = resolveSubjectColor(cls?.subject);
                            const st = s._status ? STATUS_STYLE[s._status] : STATUS_STYLE.none;
                            return (
                              <div key={s.id} className="absolute rounded-lg p-1.5 text-left text-white text-[10px] leading-tight overflow-hidden" style={{ top, height, left: `calc(${lay.col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: bg }}>
                                <p className="font-semibold truncate">{s.class_name || cls?.class_name}</p>
                                {cls?.subject && <p className="opacity-90 truncate">{cls.subject}</p>}
                                <p className="opacity-90 truncate">{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                                {s.teacher_name && <p className="opacity-80 truncate">{s.teacher_name}</p>}
                                <span className="mt-1 inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: st.bg, border: st.border }}>{st.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Print-only clean timetable (landscape). Shows the current week and,
            when any biweekly classes exist, the following week so both halves of
            a 2-week rotation print together. Blocks show subject, teacher, room. */}
        <div className="hidden print:block">
          <h1 className="text-lg font-bold text-slate-900 mb-3">Weekly Schedule · {student?.student_name}</h1>
          <PrintableTimetable weekStart={weekStart} schedules={schedules} classes={classes} resolveSubjectColor={resolveSubjectColor} />
          {hasBiweekly && (
            <div className="mt-8 print:break-before-page">
              <PrintableTimetable weekStart={addWeeks(weekStart, 1)} schedules={schedules} classes={classes} resolveSubjectColor={resolveSubjectColor} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}