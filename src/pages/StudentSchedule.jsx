import React, { useState } from "react";
import { Calendar } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import Skeleton from "@/components/Skeleton";
import StudentScheduleGrid from "@/components/student/StudentScheduleGrid";
import useStudentPortalData from "@/hooks/useStudentPortalData";
import { addWeeks, formatWeekRange, getWeekStart } from "@/lib/scheduleWeeks";

export default function StudentSchedule() {
  const { loading, error, profile, schedules } = useStudentPortalData(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  if (loading) return <Skeleton className="h-96 max-w-5xl mx-auto" />;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  return <div className="max-w-5xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-slate-900">My Schedule</h1><p className="text-sm text-slate-500">Your weekly class timetable.</p></div><SectionCard title="Weekly Schedule" subtitle={formatWeekRange(weekStart)} icon={Calendar}><StudentScheduleGrid schedules={schedules} classes={profile?.classes || []} weekStart={weekStart} onPrev={() => setWeekStart(addWeeks(weekStart, -1))} onNext={() => setWeekStart(addWeeks(weekStart, 1))} onToday={() => setWeekStart(getWeekStart(new Date()))} /></SectionCard></div>;
}