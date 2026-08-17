import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SectionCard from "@/components/SectionCard";

export default function StudentClassFocus({ classes, attendance, attainment, teacherAssignments, schoolCode, user }) {
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const rows = useMemo(() => classes.map((classItem) => {
    const grades = attainment.filter((item) => item.class_id === classItem.id);
    const records = attendance.filter((item) => item.class_id === classItem.id);
    const average = grades.length ? Math.round(grades.reduce((sum, item) => sum + item.score / (item.max_score || 100) * 100, 0) / grades.length) : null;
    const attendanceRate = records.length ? Math.round(records.filter((item) => item.status === "present" || item.status === "late").length / records.length * 100) : null;
    return { classItem, average, attendanceRate, teachers: teacherAssignments.filter((item) => item.class_id === classItem.id) };
  }), [classes, attendance, attainment, teacherAssignments]);
  const send = async () => {
    setSending(true); setError("");
    const result = await base44.functions.invoke("manageStaffMessages", { action: "send", school_code: schoolCode, recipient_id: selected.teacher_id, content: message, caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email) });
    setSending(false);
    if (result.data?.success) { setSelected(null); setMessage(""); } else setError(result.data?.error || "Message could not be sent.");
  };
  return <><SectionCard title="Class focus and teachers">
    {rows.length ? <div className="divide-y divide-slate-100">{rows.map(({ classItem, average, attendanceRate, teachers }) => <div key={classItem.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-slate-800">{classItem.class_name} <span className="font-normal text-slate-400">· {classItem.subject || "—"}</span></p><p className="mt-1 text-xs text-slate-500">Academic: {average === null ? "No grades" : `${average}%`} · Attendance: {attendanceRate === null ? "No records" : `${attendanceRate}%`}</p></div><div className="flex flex-wrap items-center gap-2">{teachers.length ? teachers.map((teacher) => <Button key={teacher.id} variant="outline" size="sm" onClick={() => setSelected({ ...teacher, className: classItem.class_name })}>Message {teacher.teacher_name || "teacher"}</Button>) : <span className="text-xs text-slate-400">Teacher not assigned</span>}</div></div>)}</div> : <p className="text-sm text-slate-400">Not enrolled in any classes.</p>}
  </SectionCard><Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Message {selected?.teacher_name || "teacher"}</DialogTitle></DialogHeader><p className="text-sm text-slate-500">Regarding {selected?.className}</p><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message…" className="min-h-32" />{error && <p className="text-sm text-rose-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={sending || !message.trim()} onClick={send}>{sending ? "Sending…" : "Send message"}</Button></DialogFooter></DialogContent></Dialog></>;
}