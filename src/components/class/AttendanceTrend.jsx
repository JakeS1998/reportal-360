import React from "react";

export default function AttendanceTrend({ attendance }) {
  const byDate = attendance.reduce((days, record) => {
    if (!days[record.date]) days[record.date] = { date: record.date, present: 0, total: 0, absent: 0, late: 0, excused: 0 };
    const day = days[record.date];
    day.total += 1;
    day[record.status] = (day[record.status] || 0) + 1;
    return days;
  }, {});
  const days = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).reverse();
  const overallRate = attendance.length ? Math.round((attendance.filter((record) => record.status === "present").length / attendance.length) * 100) : 0;

  if (!attendance.length) return <p className="text-sm text-slate-400">No attendance records.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div><p className="text-2xl font-bold text-slate-900">{overallRate}%</p><p className="text-xs text-slate-400">Overall present</p></div>
        <p className="text-xs text-slate-400">Last {days.length} register{days.length === 1 ? "" : "s"}</p>
      </div>
      <div className="space-y-3">
        {days.map((day) => {
          const rate = Math.round((day.present / day.total) * 100);
          return <div key={day.date} className="grid grid-cols-[84px_1fr_auto] items-center gap-3 text-sm"><span className="text-slate-500">{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div><span className="font-medium text-slate-700">{rate}% <span className="font-normal text-slate-400">({day.present}/{day.total})</span></span></div>;
        })}
      </div>
      <p className="text-xs text-slate-400">Present students as a share of each recorded register.</p>
    </div>
  );
}