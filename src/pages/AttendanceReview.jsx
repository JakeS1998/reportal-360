import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import AttendanceRecordsTable from "@/components/attendance-review/AttendanceRecordsTable";
import EditAttendanceRecordDialog from "@/components/attendance-review/EditAttendanceRecordDialog";
import { Input } from "@/components/ui/input";

export default function AttendanceReview() {
  const { user, activeSchool, canManageStaff } = useSchool();
  const [records, setRecords] = useState([]); const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(null); const [saving, setSaving] = useState(false); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [date, setDate] = useState("");
  const payload = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: activeSchool?.school_code };
  const load = useCallback(async () => { if (!activeSchool?.school_code) return; setLoading(true); const response = await base44.functions.invoke("manageAttendanceReview", { action: "list", ...payload }); setRecords(response.data?.records || []); setLoading(false); }, [activeSchool?.school_code, user?.id]);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => records.filter((item) => (!date || item.date === date) && (status === "all" || item.status === status) && `${item.student_name} ${item.class_name}`.toLowerCase().includes(search.toLowerCase())), [records, search, status, date]);
  const save = async (changes) => { setSaving(true); const response = await base44.functions.invoke("manageAttendanceReview", { action: "update", record_id: editing.id, ...changes, ...payload }); if (response.data?.success) { setEditing(null); await load(); } setSaving(false); };
  if (!canManageStaff) return <p className="py-16 text-center text-sm text-slate-400">School manager access is required.</p>;
  return <div className="space-y-5"><div><h2 className="text-lg font-bold text-slate-900">Attendance Review</h2><p className="text-sm text-slate-500">Review school-wide attendance and correct submitted records.</p></div><div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a student or class" className="w-56" /><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-44" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm"><option value="all">All statuses</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></div><div className="rounded-xl border border-slate-200 bg-white">{loading ? <p className="p-8 text-center text-sm text-slate-400">Loading attendance records…</p> : <AttendanceRecordsTable records={visible} onEdit={setEditing} />}</div><EditAttendanceRecordDialog record={editing} onClose={() => setEditing(null)} onSave={save} saving={saving} /></div>;
}