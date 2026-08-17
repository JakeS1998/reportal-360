import React from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherAvailabilitySchedule({ schedule }) {
  const grouped = DAYS.map((day) => ({
    day,
    slots: schedule.filter((slot) => slot.day_of_week === day).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))),
  }));

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <div className="grid min-w-[720px] grid-cols-5 divide-x divide-slate-200 bg-slate-100">
        {grouped.map(({ day, slots }) => (
          <div key={day} className="min-h-32 p-2">
            <p className="text-xs font-semibold text-slate-700">{day}</p>
            <div className="mt-2 space-y-2">
              {slots.length ? slots.map((slot) => (
                <div key={slot.id} className="rounded-md border border-blue-100 bg-blue-50 p-2 text-xs text-blue-900">
                  <p className="font-semibold">{slot.class_name || slot.period_label || "Teaching"}</p>
                  <p className="mt-1 text-blue-700">{slot.start_time}–{slot.end_time}</p>
                </div>
              )) : <p className="pt-4 text-xs text-slate-400">Available</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}