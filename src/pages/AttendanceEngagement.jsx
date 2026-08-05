import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import { useStudentMetrics } from "@/lib/useStudentMetrics";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { CalendarCheck, AlertTriangle, Activity, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AttendanceEngagement() {
  const { activeSchool, loading, filters } = useSchool();
  const metrics = useStudentMetrics();

  if (loading || !activeSchool) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }

  const school = activeSchool;
  const attendancePct = metrics.avgAttendance;
  const chronicRate = metrics.total ? Math.round((metrics.chronic / metrics.total) * 1000) / 10 : null;

  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const monthly = months.map((m, i) => {
    const seasonal = Math.sin((i / 11) * Math.PI) * 1.5;
    return { month: m, attendance: Math.max(0, Math.round((attendancePct - 1.5 + seasonal) * 10) / 10) };
  });

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Average Daily Attendance" value={attendancePct} previous={metrics.prev?.avgAttendance} suffix="%" accent="#10B981" year="2026" tooltip="Average attendance rate across all students in the 2026 roster." />
          <KpiCard label="Chronic Absenteeism" value={chronicRate} previous={metrics.prev?.chronicRate} suffix="%" lowerIsBetter accent="#F59E0B" year="2026" tooltip="Percentage of students with attendance below 90%." />
          <KpiCard label="Chronic Students" value={metrics.chronic} previous={metrics.prev?.chronic} accent="#EF4444" year="2026" tooltip="Students with attendance below 90%." />
          <KpiCard label="Students in Roster" value={metrics.total} previous={metrics.prev?.total} accent="#1D4ED8" year="2026" tooltip="Total students in the 2026 sample roster matching current filters." />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={60} className="lg:col-span-2">
          <SectionCard title="Attendance Trends" subtitle="Modeled monthly pattern from roster average" icon={Activity}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} formatter={(v) => `${v}%`} />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                  {monthly.map((d, i) => (
                    <Cell key={i} fill={d.attendance < 93 ? "#F59E0B" : d.attendance < 95 ? "#0EA5E9" : "#10B981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-400 mt-2">Monthly pattern modeled from the roster average attendance; connect a SIS for actual daily counts.</p>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionCard title="Attendance Risk" subtitle="Students needing attention (2026 roster)" icon={AlertTriangle}>
            <div className="space-y-3">
              <RiskRow label="Chronically absent (< 90%)" value={metrics.chronic} color="#EF4444" />
              <RiskRow label="Approaching threshold (90–95%)" value={metrics.approaching} color="#F59E0B" />
              <RiskRow label="On track (≥ 95%)" value={metrics.onTrack} color="#10B981" />
            </div>
            <p className="text-[11px] text-slate-400 mt-4">Calculated from individual student attendance rates in the 2026 roster.</p>
          </SectionCard>
        </FadeIn>
      </div>

      <FadeIn delay={180}>
        <SectionCard title="Attendance by Grade" subtitle="Average attendance by grade level (2026 roster)" icon={Users}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {metrics.attendanceByGrade
              .filter((g) => filters.grade === "All Grades" || `Grade ${g.grade}` === filters.grade)
              .map((g) => (
                <div key={g.grade} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Grade {g.grade}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{g.attendance != null ? `${g.attendance}%` : "—"}</p>
                </div>
              ))}
          </div>
        </SectionCard>
      </FadeIn>
    </div>
  );
}

function RiskRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value != null ? value : "—"}</span>
    </div>
  );
}