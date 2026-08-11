import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClassAttendanceManager from "@/components/class/ClassAttendanceManager";
import ClassBehaviourManager from "@/components/class/ClassBehaviourManager";

/**
 * Quick actions dialog for a class block launched from the My Classes calendar.
 * mode: "attendance" | "behaviour"
 */
export default function QuickActionsDialog({ open, onOpenChange, mode, classId, scheduleId, className, dayLabel, dateStr, user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !classId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let roster = [];
        const sc = await base44.entities.StudentClass.filter({ class_id: classId, status: "active" }, "student_name", 500).catch(() => []);
        roster = sc.map((s) => ({ ...s, student_id: s.student_id || s.id }));
        if (roster.length === 0) {
          const hrs = await base44.entities.Homeroom.filter({ class_id: classId }, undefined, 1).catch(() => []);
          if (hrs.length && hrs[0].student_ids?.length) {
            const hr = hrs[0];
            const idSet = new Set(hr.student_ids);
            let allStudents = [];
            try {
              const res = await base44.functions.invoke("manageStudents", {
                action: "list",
                caller_username: user?.username,
                caller_password: user?.password || localStorage.getItem("userPassword") || "",
                school_code: hr.school_code,
              });
              allStudents = res.data?.students || [];
            } catch (e) { /* ignore */ }
            if (allStudents.length === 0) {
              allStudents = await base44.entities.Student.filter({ school_code: hr.school_code }, "student_name", 500).catch(() => []);
            }
            roster = allStudents
              .filter((s) => idSet.has(s.id))
              .map((s) => ({ id: s.id, student_id: s.id, student_name: s.student_name, class_id: classId, status: "active" }));
          }
        }
        if (cancelled) return;
        setStudents(roster);
      } catch (e) {
        if (!cancelled) setError("Could not load class roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, classId, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "attendance" ? "Take Attendance" : "Log Behaviour"} · {className}
          </DialogTitle>
          <p className="text-xs text-slate-500">{dayLabel}</p>
        </DialogHeader>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading roster…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-500">{error}</div>
        ) : students.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No students enrolled in this class.</div>
        ) : mode === "attendance" ? (
          <ClassAttendanceManager classId={classId} scheduleId={scheduleId} dateStr={dateStr} students={students} user={user} onSaved={() => onOpenChange(false)} />
        ) : (
          <ClassBehaviourManager classId={classId} students={students} onSaved={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}