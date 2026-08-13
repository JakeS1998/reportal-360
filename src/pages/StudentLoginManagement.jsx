import React, { useEffect, useState } from "react";
import { KeyRound, Search, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SectionCard from "@/components/SectionCard";

export default function StudentLoginManagement() {
  const { user, school } = useSchool();
  const [students, setStudents] = useState([]); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const credentials = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email) };
  const load = async () => { setLoading(true); const res = await base44.functions.invoke("manageStudents", { action: "list", ...credentials, school_code: user?.school_code || school?.school_code }); setStudents(res.data?.students || []); setLoading(false); };
  useEffect(() => { if (user && ["admin", "area", "manager", "school_admin"].includes(user.role)) load(); }, [user?.id]);
  const reset = async (student) => { if (!confirm(`Reset the password for ${student.student_name}?`)) return; const res = await base44.functions.invoke("manageStudents", { action: "reset_password", ...credentials, student_id: student.id }); setMessage(res.data?.success ? `Temporary password for ${student.student_name}: ${res.data.temp_password}` : res.data?.error || "Password reset failed"); };
  if (!user || !["admin", "area", "manager", "school_admin"].includes(user.role)) return <p className="py-16 text-center text-sm text-slate-400">You do not have access to student login management.</p>;
  const visible = students.filter((student) => `${student.student_name} ${student.username}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Student Login Management</h1><p className="mt-1 text-sm text-slate-500">View student account names and issue temporary password resets.</p></div><SectionCard title="Student Accounts" subtitle={`${visible.length} student${visible.length === 1 ? "" : "s"}`} icon={Users}><div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student or login name" className="pl-9" /></div>{message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}{loading ? <p className="py-8 text-center text-sm text-slate-400">Loading student accounts…</p> : <div className="divide-y divide-slate-100">{visible.map((student) => <div key={student.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{student.student_name}</p><p className="truncate font-mono text-xs text-slate-500">{student.username || "No login name"}</p></div><Button onClick={() => reset(student)} variant="outline" size="sm"><KeyRound className="mr-1.5 w-3.5 h-3.5" /> Reset password</Button></div>)}</div>}</div></SectionCard></div>;
}