import React, { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import Skeleton from "@/components/Skeleton";
import useStudentPortalData from "@/hooks/useStudentPortalData";

export default function StudentAttendance() {
  const { loading, error, profile } = useStudentPortalData();
  const attendance = useMemo(() => {
    const records = profile?.attendance || [];
    if (!records.length) return null;
    const present = records.filter((item) => item.status === "present").length;
    return { present, total: records.length, rate: Math.round((present / records.length) * 100) };
  }, [profile]);
  if (loading) return <Skeleton className="h-48 max-w-5xl mx-auto" />;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  const color = attendance?.rate >= 90 ? "bg-emerald-500" : attendance?.rate >= 75 ? "bg-amber-500" : "bg-rose-500";
  return <div className="max-w-5xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-slate-900">My Attendance</h1><p className="text-sm text-slate-500">Your attendance across all enrolled classes.</p></div><SectionCard title="Attendance Rate" subtitle="Recorded class sessions" icon={ClipboardCheck}>{attendance ? <div className="flex items-center gap-6"><div><p className="text-4xl font-bold text-slate-900">{attendance.rate}%</p><p className="mt-1 text-xs text-slate-400">{attendance.present} of {attendance.total} sessions present</p></div><div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${attendance.rate}%` }} /></div></div> : <p className="text-sm text-slate-400">No attendance records yet.</p>}</SectionCard></div>;
}