import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Clock, MinusCircle, Save, Send, BadgeCheck, Lock, CalendarOff } from "lucide-react";
import { getWeekStart, isScheduleActiveInWeek } from "@/lib/scheduleWeeks";
import ExcusedAbsenceFields from "@/components/class/ExcusedAbsenceFields";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUSES = [
  { key: "present", label: "Present", icon: Check, active: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { key: "absent", label: "Absent", icon: X, active: "bg-rose-100 text-rose-700 border-rose-300" },
  { key: "late", label: "Late", icon: Clock, active: "bg-amber-100 text-amber-700 border-amber-300" },
  { key: "excused", label: "Excused", icon: MinusCircle, active: "bg-slate-200 text-slate-700 border-slate-400" },
];

const INACTIVE = "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";

export default function ClassAttendanceManager({ classId, scheduleId, dateStr, students, user, individual = false, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayName = DAY_NAMES[new Date().getDay()];
  const [date] = useState(dateStr || today);
  const [marks, setMarks] = useState(() => Object.fromEntries(students.map((s) => [s.student_id, "present"])));
  const [excuseDetails, setExcuseDetails] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [meetsToday, setMeetsToday] = useState(false);
  const [state, setState] = useState(null); // null | { submitted: bool }

  const set = (id, status) => {
    setMarks((current) => ({ ...current, [id]: status }));
    if (status !== "excused") setExcuseDetails((current) => { const next = { ...current }; delete next[id]; return next; });
  };
  const markAll = (status) => {
    setMarks(Object.fromEntries(students.map((s) => [s.student_id, status])));
    if (status !== "excused") setExcuseDetails({});
  };

  // Determine whether this class is scheduled to meet today.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setLoadingSchedule(true);
      try {
        const scheds = await base44.entities.ClassSchedule.filter({ class_id: classId }, undefined, 200);
        if (cancelled) return;
        const weekStart = getWeekStart(new Date());
        // No schedule records → legacy/unscheduled class, allow (default to today).
        // Otherwise the class must have a session whose day matches today and is active this week.
        const meets = scheds.length === 0 || scheds.some((s) => s.day_of_week === todayName && isScheduleActiveInWeek(s, weekStart));
        setMeetsToday(meets);
      } catch (e) {
        setMeetsToday(false);
      } finally {
        if (!cancelled) setLoadingSchedule(false);
      }
    };
    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadExisting = async () => {
    setLoadingExisting(true);
    try {
      const filters = individual
        ? { class_id: classId, schedule_id: scheduleId, date, student_id: students[0]?.student_id }
        : { class_id: classId, schedule_id: scheduleId, date };
      const recs = await base44.entities.AttendanceRecord.filter(filters, undefined, 500);
      if (recs.length > 0) {
        const m = {};
        recs.forEach((r) => { m[r.student_id] = r.status; });
        students.forEach((s) => { if (!(s.student_id in m)) m[s.student_id] = "present"; });
        setMarks(m);
        setExcuseDetails(Object.fromEntries(recs.filter((r) => r.status === "excused").map((r) => [r.student_id, { reason: r.excused_reason || "", fileUrl: r.attachment_file_url || "", fileName: r.attachment_file_name || "" }])));
        setState({ submitted: recs.every((r) => r.submitted) });
      } else {
        setMarks(Object.fromEntries(students.map((s) => [s.student_id, "present"])));
        setExcuseDetails({});
        setState(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const persist = async (submitted) => {
    setSaving(true);
    try {
      const buildRecord = async (student) => {
        const status = marks[student.student_id] || "present";
        const detail = excuseDetails[student.student_id] || {};
        const upload = detail.file ? await base44.integrations.Core.UploadFile({ file: detail.file }) : null;
        return {
          student_id: student.student_id, class_id: classId, schedule_id: scheduleId, date, status, submitted,
          excused_reason: status === "excused" ? detail.reason || "" : "",
          attachment_file_url: status === "excused" ? upload?.file_url || detail.fileUrl || "" : "",
          attachment_file_name: status === "excused" ? detail.file?.name || detail.fileName || "" : "",
        };
      };
      if (individual) {
        const student = students[0];
        const existing = await base44.entities.AttendanceRecord.filter({ class_id: classId, schedule_id: scheduleId, date, student_id: student.student_id }, undefined, 1);
        const record = await buildRecord(student);
        if (existing[0]) await base44.entities.AttendanceRecord.update(existing[0].id, record);
        else await base44.entities.AttendanceRecord.create(record);
      } else {
        const records = await Promise.all(students.map(buildRecord));
        await base44.entities.AttendanceRecord.deleteMany({ class_id: classId, schedule_id: scheduleId, date });
        await base44.entities.AttendanceRecord.bulkCreate(records);
      }
      if (submitted) {
        const absentStudents = students.filter((student) => marks[student.student_id] === "absent");
        await Promise.allSettled(absentStudents.map((student) => base44.functions.invoke("manageParentConversations", {
          action: "absence_notification",
          student_id: student.student_id,
          attendance_date: date,
          caller_username: user?.username,
          caller_password: user?.password || localStorage.getItem("userPassword") || "",
          caller_email: user?.email || "",
          caller_sso: Boolean(user?.sso || user?.email),
        })));
      }
      await loadExisting();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) return <p className="text-sm text-slate-400">No students to mark.</p>;

  if (loadingSchedule) return <p className="text-sm text-slate-400">Checking schedule…</p>;

  if (!meetsToday) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <CalendarOff className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-700">This class isn't scheduled today ({todayName})</p>
          <p className="text-xs text-slate-500 mt-0.5">Attendance can only be taken on days the class meets, according to the schedule.</p>
        </div>
      </div>
    );
  }

  const locked = state?.submitted;

  const badge = loadingExisting
    ? { text: "Loading…", cls: "bg-slate-100 text-slate-500" }
    : locked
      ? { text: "Submitted", cls: "bg-emerald-50 text-emerald-600" }
      : state
        ? { text: "Draft", cls: "bg-amber-50 text-amber-600" }
        : { text: "Not taken", cls: "bg-slate-100 text-slate-500" };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div>
          <label className="text-xs font-medium text-slate-500">Date</label>
          <Input type="date" value={date} disabled className="mt-0.5 w-44 opacity-70" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
        {!locked && (
          <Button onClick={() => markAll("present")} variant="outline" size="sm">
            <Check className="w-3.5 h-3.5 mr-1" /> Mark all present
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {!locked && (
            <>
              <Button onClick={() => persist(false)} disabled={saving || loadingExisting} variant="outline" size="sm">
                <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save Draft"}
              </Button>
              <Button onClick={() => persist(true)} disabled={saving || loadingExisting} size="sm" className="bg-slate-900 hover:bg-slate-800">
                <Send className="w-3.5 h-3.5 mr-1" />
                {saving ? "Saving…" : "Submit"}
              </Button>
            </>
          )}
        </div>
      </div>

      {locked ? (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Attendance has been submitted and is locked. No further changes can be made.
        </p>
      ) : (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5" />
          Save a draft to come back later, or Submit to finalize. Once submitted, the record is locked.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-50 pr-1">
        {students.map((sa) => (
          <div key={sa.id} className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-500">{(sa.student_name || "?").charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 flex-1 truncate">{sa.student_name}</p>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
              {STATUSES.map((st) => {
                const active = marks[sa.student_id] === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => set(sa.student_id, st.key)}
                    disabled={locked}
                    title={st.label}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${active ? st.active : INACTIVE} ${locked ? "cursor-not-allowed opacity-60 hover:bg-transparent" : ""}`}
                  >
                    <st.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{st.label}</span>
                  </button>
                );
              })}
              </div>
              {marks[sa.student_id] === "excused" && <ExcusedAbsenceFields detail={excuseDetails[sa.student_id]} disabled={locked} onChange={(detail) => setExcuseDetails((current) => ({ ...current, [sa.student_id]: detail }))} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}