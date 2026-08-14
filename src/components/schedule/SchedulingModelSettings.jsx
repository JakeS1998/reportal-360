import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulingModelSettings({ form, update }) {
  const toggleDay = (day) => update("school_days", form.school_days.includes(day) ? form.school_days.filter((value) => value !== day) : [...form.school_days, day]);
  return <div className="space-y-4 rounded-xl border border-border p-4">
    <div><Label>Scheduling model</Label><select value={form.scheduling_model} onChange={(event) => update("scheduling_model", event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="traditional">Traditional daily periods</option><option value="rotating_block">Rotating block (A/B/C/D)</option><option value="flexible_weekly">Flexible weekly timetable</option></select></div>
    <div><Label>School days</Label><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day} className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={form.school_days.includes(day)} onChange={() => toggleDay(day)} />{day.slice(0, 3)}</label>)}</div></div>
    {form.scheduling_model === "rotating_block" && <div className="grid gap-3 sm:grid-cols-2"><div><Label>Cycle day types</Label><Input value={form.cycle_day_types.join(", ")} onChange={(event) => update("cycle_day_types", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="A, B" className="mt-1" /></div><div><Label>Cycle start date</Label><Input type="date" value={form.cycle_start_date} onChange={(event) => update("cycle_start_date", event.target.value)} className="mt-1" /></div></div>}
    {form.scheduling_model === "flexible_weekly" && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Flexible weekly uses the daily periods below. Classes can be placed in different periods on different days, including more than once on the same day.</p>}
  </div>;
}