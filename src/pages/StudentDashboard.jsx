import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/SectionCard";
import Skeleton from "@/components/Skeleton";
import StudentScheduleGrid from "@/components/student/StudentScheduleGrid";
import { getWeekStart, addWeeks, formatWeekRange } from "@/lib/scheduleWeeks";
import { Calendar, BookOpen, ClipboardCheck } from "lucide-react";

const callerCreds = (user) => ({
  caller_username: user?.username,
  caller_password: user?.password || localStorage.getItem("userPassword") || "",
});

const letterGrade = (score) => {
  if (score == null || score === "") return "";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session?.user || session.user.role !== "student") {
      navigate("/login", { replace: true });
      return;
    }
    setUser(session.user);
    const load = async () => {
      try {
        const res = await base44.functions.invoke("manageStudents", {
          action: "get_profile",
          ...callerCreds(session.user),
          student_id: session.user.student_id,
        });
        if (!res.data?.success) { setError(res.data?.error || "Unable to load your profile"); return; }
        setProfile(res.data);
        const sched = await base44.entities.ClassSchedule.filter(
          { school_code: session.user.school_code }, "start_time", 500
        );
        const classIds = new Set((res.data.classes || []).map((c) => c.id));
        setSchedules(sched.filter((s) => classIds.has(s.class_id)));
      } catch (e) {
        setError(e.message || "Unable to load your profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const grades = useMemo(() => {
    if (!profile) return [];
    const byClass = {};
    (profile.attainment || []).forEach((a) => {
      const pct = (a.score / (a.max_score || 100)) * 100;
      (byClass[a.class_id] ||= []).push(pct);
    });
    return (profile.classes || []).map((c) => {
      const arr = byClass[c.id] || [];
      const avg = arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;
      return { class: c, score: avg, grade: avg == null ? "" : letterGrade(avg), count: arr.length };
    });
  }, [profile]);

  const attendance = useMemo(() => {
    if (!profile) return null;
    const records = profile.attendance || [];
    if (records.length === 0) return null;
    const present = records.filter((a) => a.status === "present").length;
    return { rate: Math.round((present / records.length) * 100), present, total: records.length };
  }, [profile]);

  if (!user) return null;

  const student = profile?.student;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        ) : (
          <>
            {/* Grades */}
            <SectionCard title="My Grades" subtitle="Average score per class" icon={BookOpen}>
              {grades.length === 0 ? (
                <p className="text-sm text-slate-400">You are not enrolled in any classes yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-3 font-medium">Class</th>
                        <th className="py-2 px-3 font-medium w-28">Subject</th>
                        <th className="py-2 px-3 font-medium w-24 text-right">Assessments</th>
                        <th className="py-2 px-3 font-medium w-28 text-right">Average</th>
                        <th className="py-2 pl-3 font-medium w-16 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {grades.map(({ class: c, score, grade, count }) => (
                        <tr key={c.id}>
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-slate-800">{c.class_name}</p>
                            {c.teacher_name && <p className="text-[11px] text-slate-400">{c.teacher_name}</p>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{c.subject || "—"}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{count}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{score == null ? "—" : `${score}%`}</td>
                          <td className="py-2.5 pl-3 text-center">
                            {grade && <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{grade}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Attendance */}
            <SectionCard title="My Attendance" subtitle="Across all your classes" icon={ClipboardCheck}>
              {attendance ? (
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-4xl font-bold text-slate-900">{attendance.rate}%</p>
                    <p className="text-xs text-slate-400 mt-1">{attendance.present} of {attendance.total} days present</p>
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${attendance.rate >= 90 ? "bg-emerald-500" : attendance.rate >= 75 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${attendance.rate}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No attendance records yet.</p>
              )}
            </SectionCard>

            {/* Schedule */}
            <SectionCard
              title="My Weekly Schedule"
              subtitle={formatWeekRange(weekStart)}
              icon={Calendar}
            >
              <StudentScheduleGrid
                schedules={schedules}
                classes={profile?.classes || []}
                weekStart={weekStart}
                onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
                onNext={() => setWeekStart(addWeeks(weekStart, 1))}
                onToday={() => setWeekStart(getWeekStart(new Date()))}
              />
            </SectionCard>
          </>
      )}
    </div>
  );
}