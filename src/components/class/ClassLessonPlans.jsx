import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import LessonPlanDialog from "@/components/lesson-plans/LessonPlanDialog";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { getWeekStart, isScheduleActiveInWeek } from "@/lib/scheduleWeeks";

const dateKey = (date) => date.toLocaleDateString("en-CA");
const timeLabel = (time) => new Date(`2000-01-01T${time || "00:00"}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function ClassLessonPlans({ classInfo, selectedLesson }) {
  const { user, school } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = async () => {
    const [scheduleRows, planResult] = await Promise.all([
      base44.entities.ClassSchedule.filter({ class_id: classInfo.id }, undefined, 200),
      base44.functions.invoke("manageLessonPlans", { action: "list", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: classInfo.school_code || school?.school_code }),
    ]);
    setSchedules(scheduleRows);
    setPlans((planResult.data?.plans || []).filter((plan) => plan.class_id === classInfo.id));
  };
  useEffect(() => { load(); }, [classInfo.id, user?.username]);
  const instances = useMemo(() => Array.from({ length: 28 }, (_, offset) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    return schedules.filter((s) => s.day_of_week === day && isScheduleActiveInWeek(s, getWeekStart(date))).map((s) => ({ ...s, date: dateKey(date) }));
  }).flat().sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)), [schedules]);
  const selectedInstances = selectedLesson ? instances.filter((session) => session.id === selectedLesson.scheduleId && session.date === selectedLesson.lessonDate) : [];
  if (!selectedLesson) return <p className="text-sm text-slate-400">Open a lesson from My Classes to view its lesson plan.</p>;
  if (!selectedInstances.length) return <p className="text-sm text-slate-400">This lesson instance is not scheduled.</p>;
  return <div className="space-y-2">{selectedInstances.map((session) => {
    const plan = plans.find((item) => item.schedule_id === session.id && item.lesson_date === session.date);
    const context = plan || { class_id: classInfo.id, class_name: classInfo.class_name, school_code: classInfo.school_code, schedule_id: session.id, lesson_date: session.date, title: `${classInfo.class_name} lesson` };
    return <div key={`${session.id}-${session.date}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"><div><p className="text-sm font-medium text-slate-800">{new Date(`${session.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {timeLabel(session.start_time)}–{timeLabel(session.end_time)}</p><p className="text-xs text-slate-500">{plan ? `${plan.title} · ${plan.status.replaceAll("_", " ")}` : "No lesson plan yet"}</p></div><Button size="sm" variant="outline" onClick={() => setEditing(context)}>{plan ? <Pencil className="mr-1 w-4 h-4" /> : <Plus className="mr-1 w-4 h-4" />}{plan ? (plan.status === "approved" ? "View" : "Edit") : "Create"}</Button></div>;
  })}<LessonPlanDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} context={editing} onSaved={load} /></div>;
}