import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import Skeleton from "@/components/Skeleton";
import StudentScheduleGrid from "@/components/student/StudentScheduleGrid";
import useStudentPortalData from "@/hooks/useStudentPortalData";
import { base44 } from "@/api/base44Client";
import { addWeeks, formatWeekRange, getWeekStart } from "@/lib/scheduleWeeks";

export default function StudentSchedule() {
  const { loading, error, profile, schedules } = useStudentPortalData(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [athleticsEvents, setAthleticsEvents] = useState([]);
  useEffect(() => { const session = JSON.parse(localStorage.getItem("userSession") || "null"); const studentId = session?.user?.student_id; const schoolCode = session?.user?.school_code; if (!studentId || !schoolCode) return; Promise.all([base44.entities.AthleticsTeamMember.filter({ student_id: studentId }), base44.entities.AthleticsEvent.filter({ school_code: schoolCode })]).then(([members, events]) => setAthleticsEvents(events.filter((event) => members.some((member) => member.team_id === event.team_id && event.status === "scheduled")))); }, [profile]);
  if (loading) return <Skeleton className="h-96 max-w-5xl mx-auto" />;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  return <div className="max-w-5xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-slate-900">My Schedule</h1><p className="text-sm text-slate-500">Your weekly class timetable.</p></div><SectionCard title="Weekly Schedule" subtitle={formatWeekRange(weekStart)} icon={Calendar}><StudentScheduleGrid schedules={schedules} classes={profile?.classes || []} athleticsEvents={athleticsEvents} weekStart={weekStart} onPrev={() => setWeekStart(addWeeks(weekStart, -1))} onNext={() => setWeekStart(addWeeks(weekStart, 1))} onToday={() => setWeekStart(getWeekStart(new Date()))} /></SectionCard></div>;
}