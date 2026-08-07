import React from "react";
import { isScheduleActiveInWeek, formatWeekRange, subjectColor } from "@/lib/scheduleWeeks";

// Falls back to the deterministic hash palette when no resolver is supplied
// (e.g. when rendered outside a component that has loaded Subject colours).

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

// Clean, attendance-free week grid for printing. Each block shows the subject,
// teacher and room only — the time is read from the left axis and grid position.
export default function PrintableTimetable({ weekStart, schedules, classes, resolveSubjectColor }) {
  const byDay = (day) =>
    schedules
      .filter((s) => s.day_of_week === day && isScheduleActiveInWeek(s, weekStart))
      .map((s) => ({ ...s, _startMin: toMin(s.start_time), _endMin: toMin(s.end_time) }))
      .filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);

  return (
    <div className="print-timetable" style={{ breakInside: "avoid" }}>
      <h2 className="text-sm font-bold text-slate-900 mb-1">Week of {formatWeekRange(weekStart)}</h2>
      <div className="flex">
        <div className="w-12 shrink-0" />
        {DAYS.map((day, idx) => {
          const d = new Date(weekStart); d.setDate(d.getDate() + idx);
          return (
            <div key={day} className="flex-1 min-w-[120px] text-center text-xs font-semibold py-2 border-b border-l border-slate-200 text-slate-700">
              <div>{day}</div>
              <div className="text-[10px] font-normal text-slate-400">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            </div>
          );
        })}
      </div>
      <div className="flex">
        <div className="w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
          {HOURS.map((m) => (
            <div key={m} className="absolute left-0 right-0 text-[10px] text-slate-500 -translate-y-1/2 text-right pr-1" style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}>
              {fmtTime(mmToHHMM(m))}
            </div>
          ))}
        </div>
        {DAYS.map((day) => {
          const blocks = byDay(day);
          const layout = layoutBlocks(blocks);
          return (
            <div key={day} className="flex-1 min-w-[120px] border-l border-slate-200">
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
                  const bg = (resolveSubjectColor || subjectColor)(cls?.subject);
                  return (
                    <div key={s.id} className="absolute rounded-md p-1.5 text-left text-white text-[10px] leading-tight overflow-hidden" style={{ top, height, left: `calc(${lay.col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: bg }}>
                      <p className="font-semibold truncate">{cls?.subject || s.class_name || "—"}</p>
                      {s.teacher_name && <p className="opacity-90 truncate">{s.teacher_name}</p>}
                      {s.room && <p className="opacity-80 truncate">Room {s.room}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}