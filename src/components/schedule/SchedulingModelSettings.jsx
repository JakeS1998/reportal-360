import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulingModelSettings({ form, update }) {
  const toggleDay = (day) => update("school_days", form.school_days.includes(day) ? form.school_days.filter((value) => value !== day) : [...form.school_days, day]);
  const updateSlot = (index, key, value) => update("flexible_slots", form.flexible_slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot));
  return <div className="space-y-4 rounded-xl border border-border p-4">
    <div><Label>Scheduling model</Label><select value={form.scheduling_model} onChange={(event) => update("scheduling_model", event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="traditional">Traditional daily periods</option><option value="rotating_block">Rotating block (A/B/C/D)</option><option value="flexible_weekly">Flexible weekly timetable</option></select></div>
    <div><Label>School days</Label><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day} className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={form.school_days.includes(day)} onChange={() => toggleDay(day)} />{day.slice(0, 3)}</label>)}</div></div>
    {form.scheduling_model === "rotating_block" && <div className="grid gap-3 sm:grid-cols-2"><div><Label>Cycle day types</Label><Input value={form.cycle_day_types.join(", ")} onChange={(event) => update("cycle_day_types", event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} placeholder="A, B" className="mt-1" /></div><div><Label>Cycle start date</Label><Input type="date" value={form.cycle_start_date} onChange={(event) => update("cycle_start_date", event.target.value)} className="mt-1" /></div></div>}
    {form.scheduling_model === "flexible_weekly" && <div><div className="mb-2 flex items-center justify-between"><Label>Weekly teaching slots</Label><Button type="button" variant="outline" size="sm" onClick={() => update("flexible_slots", [...form.flexible_slots, { day_of_week: "Monday", start: "08:30", end: "09:30", label: "Lesson" }])}>Add slot</Button></div><div className="space-y-2">{form.flexible_slots.map((slot, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"><select value={slot.day_of_week} onChange={(event) => updateSlot(index, "day_of_week", event.target.value)} className="rounded-md border border-input bg-background px-2 text-sm">{DAYS.map((day) => <option key={day}>{day}</option>)}</select><Input type="time" value={slot.start} onChange={(event) => updateSlot(index, "start", event.target.value)} /><Input type="time" value={slot.end} onChange={(event) => updateSlot(index, "end", event.target.value)} /><Button type="button" variant="ghost" size="sm" onClick={() => update("flexible_slots", form.flexible_slots.filter((_, slotIndex) => slotIndex !== index))}>Remove</Button></div>)}</div></div>}
  </div>;
}