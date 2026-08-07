import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SectionCard from "@/components/SectionCard";
import StudentScheduleGrid from "@/components/student/StudentScheduleGrid";
import { getWeekStart, addWeeks, formatWeekRange } from "@/lib/scheduleWeeks";
import { ClipboardCheck, BookOpen, Calendar, Eye } from "lucide-react";

const letterGrade = (score) => {
  if (score == null || score === "") return "";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

// Renders a faithful, read-only preview of the student portal (the same grades,
// attendance and weekly schedule a student sees) for managers/teachers viewing
// a student profile. Data is supplied by the caller (already scoped server-side).
export default function StudentPortalPreview({ open, onOpenChange, student, classes, attendance, attainment, schoolCode }) {
  const [schedules, setSchedules] = useState([]);
  const [loadingSched, setLoadingSched] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const classIds = useMemo(() => new Set((classes || []).map((c) => c.id)), [classes]);

  useEffect(() => {
    if (!open || !schoolCode) return;
    let active = true;
    (async () => {
      setLoadingSched(true);
      try {
        const sched = await base44.entities.ClassSchedule.filter({ school_code: schoolCode }, "start_time", 500);
        if (active) setSchedules(sched.filter((s) => classIds.has(s.class_id)));
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingSched(false);
      }
    })();
    return () => { active = false; };
  }, [open, schoolCode, classIds]);

  const grades = useMemo(() => {
    const byClass = {};
    (attainment || []).forEach((a) => {
      const pct = (a.score / (a.max_score || 100)) * 100;
      (byClass[a.class_id] ||= []).push(pct);
    });
    return (classes || []).map((c) => {
      const arr = byClass[c.id] || [];
      const avg = arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null;
      return { class: c, score: avg, grade: avg == null ? "" : letterGrade(avg), count: arr.length };
    });
  }, [classes, attainment]);

  const attendanceSummary = useMemo(() => {
    const records = attendance || [];
    if (records.length === 0) return null;
    const present = records.filter((a) => a.status === "present").length;
    return { rate: Math.round((present / records.length) * 100), present, total: records.length };
  }, [attendance]);

  const firstName = (student?.student_name || "").split(" ")[0] || "this student";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-400" />
            View as Student · {student?.student_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <ClipboardCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">This is a read-only preview of what {firstName} sees in the student portal. No changes can be made here.</p>
          </div>

          <SectionCard title="My Grades" subtitle="Average score per class" icon={BookOpen}>
            {grades.length === 0 ? (
              <p className="text-sm text-slate-400">Not enrolled in any classes yet.</p>
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

          <SectionCard title="My Attendance" subtitle="Across all classes" icon={ClipboardCheck}>
            {attendanceSummary ? (
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-4xl font-bold text-slate-900">{attendanceSummary.rate}%</p>
                  <p className="text-xs text-slate-400 mt-1">{attendanceSummary.present} of {attendanceSummary.total} days present</p>
                </div>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${attendanceSummary.rate >= 90 ? "bg-emerald-500" : attendanceSummary.rate >= 75 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${attendanceSummary.rate}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No attendance records yet.</p>
            )}
          </SectionCard>

          <SectionCard title="My Weekly Schedule" subtitle={formatWeekRange(weekStart)} icon={Calendar}>
            {loadingSched ? (
              <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
            ) : (
              <StudentScheduleGrid
                schedules={schedules}
                classes={classes || []}
                weekStart={weekStart}
                onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
                onNext={() => setWeekStart(addWeeks(weekStart, 1))}
                onToday={() => setWeekStart(getWeekStart(new Date()))}
              />
            )}
          </SectionCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}