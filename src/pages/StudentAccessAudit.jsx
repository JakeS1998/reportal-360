import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import { ShieldCheck } from "lucide-react";

export default function StudentAccessAudit() {
  const { user, school } = useSchool();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!school?.school_code) return;
    setLoading(true);
    const res = await base44.functions.invoke("manageStudents", { action: "list_access_audit", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), school_code: school.school_code });
    setLogs(res.data?.logs || []);
    setLoading(false);
  }, [school?.school_code, user]);
  useEffect(() => { load(); }, [load]);
  const allowed = ["admin", "area", "manager", "school_admin"].includes(user?.role);
  if (!allowed) return <p className="py-16 text-center text-sm text-slate-400">Manager access is required.</p>;
  return <SectionCard title="Student Access Audit" subtitle="Teacher access to student records" icon={ShieldCheck}>{loading ? <div className="h-48 animate-pulse rounded-xl bg-slate-100" /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-slate-400"><th className="pb-3">Time</th><th className="pb-3">Teacher</th><th className="pb-3">Role</th><th className="pb-3">Student record</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log.id} className="border-b border-slate-100"><td className="py-3 text-slate-500">{new Date(log.created_date).toLocaleString()}</td><td className="py-3 font-medium text-slate-800">{log.username || "—"}</td><td className="py-3 text-slate-500">{log.user_role || "—"}</td><td className="py-3 text-slate-600">{log.student_id || "—"}</td></tr>) : <tr><td colSpan="4" className="py-10 text-center text-slate-400">No student access has been recorded.</td></tr>}</tbody></table></div>}</SectionCard>;
}