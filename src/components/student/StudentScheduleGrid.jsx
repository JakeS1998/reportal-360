import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isScheduleActiveInWeek } from "@/lib/scheduleWeeks";
import { useSubjectColors } from "@/lib/useSubjectColors";
import AthleticsScheduleBlock from "@/components/athletics/AthleticsScheduleBlock";

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

export default function StudentScheduleGrid({ schedules, classes, athleticsEvents = [], weekStart, onPrev, onNext, onToday }) {
  const { resolveSubjectColor } = useSubjectColors();
  const byDay = (day) => {
    const date = new Date(weekStart); date.setDate(date.getDate() + DAYS.indexOf(day)); const dateStr = date.toISOString().slice(0, 10);
    return [...schedules.filter((s) => s.day_of_week === day && isScheduleActiveInWeek(s, weekStart)), ...athleticsEvents.filter((event) => event.event_date === dateStr).map((event) => ({ ...event, id: `athletics-${event.id}`, start_time: event.out_of_class_start, end_time: event.out_of_class_end, _athletics: true }))].map((s) => ({ ...s, _startMin: toMin(s.start_time), _endMin: toMin(s.end_time) })).filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="icon" onClick={onPrev}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={onToday}>This Week</Button>
        <Button variant="outline" size="icon" onClick={onNext}><ChevronRight className="w-4 h-4" /></Button>
      </div>
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
          {DAYS.map((day) => {
            const blocks = byDay(day);
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
                    if (s._athletics) return <AthleticsScheduleBlock key={s.id} event={s} style={{ top, height, left: `calc(${lay.col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }} />;
                    const cls = classes.find((c) => c.id === s.class_id);
                    const bg = resolveSubjectColor(cls?.subject);
                    return (
                      <div key={s.id} className="absolute rounded-lg p-1.5 text-left text-white text-[10px] leading-tight overflow-hidden" style={{ top, height, left: `calc(${lay.col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: bg }}>
                        <p className="font-semibold truncate">{s.class_name || cls?.class_name}</p>
                        {cls?.subject && <p className="opacity-90 truncate">{cls.subject}</p>}
                        <p className="opacity-90 truncate">{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                        {s.teacher_name && <p className="opacity-80 truncate">{s.teacher_name}</p>}
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
    </div>
  );
}