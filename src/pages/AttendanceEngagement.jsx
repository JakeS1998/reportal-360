import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import { CalendarCheck, AlertTriangle, Activity, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AttendanceEngagement() {
  const { school, loading } = useSchool();

  if (loading || !school) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  }

  const p = school.previous || {};
  const attendancePct = school.chronic_absenteeism != null ? Math.round((100 - school.chronic_absenteeism) * 100) / 100 : null;
  const prevAttendance = p.chronic_absenteeism != null ? Math.round((100 - p.chronic_absenteeism) * 100) / 100 : null;
  const chronicStudents = school.enrollment && school.chronic_absenteeism != null ? Math.round((school.enrollment * school.chronic_absenteeism) / 100) : null;
  const approaching = chronicStudents != null ? Math.round(chronicStudents * 0.6) : null;

  // Modeled monthly attendance pattern around the annual average
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const monthly = months.map((m, i) => {
    const seasonal = Math.sin((i / 11) * Math.PI) * 1.5;
    return { month: m, attendance: Math.max(0, Math.round((attendancePct - 1.5 + seasonal) * 10) / 10) };
  });

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard label="Average Daily Attendance" value={attendancePct} previous={prevAttendance} suffix="%" accent="#10B981" year={school.year} />
          <KpiCard label="Chronic Absenteeism" value={school.chronic_absenteeism} previous={p.chronic_absenteeism} suffix="%" lowerIsBetter accent="#F59E0B" year={school.year} />
          <KpiCard label="Chronic Students" value={chronicStudents} accent="#EF4444" year={school.year} />
          <KpiCard label="Enrollment" value={school.enrollment} previous={p.enrollment} accent="#1D4ED8" year={school.year} />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn delay={60} className="lg:col-span-2">
          <SectionCard title="Attendance Trends" subtitle="Modeled monthly attendance pattern" icon={Activity}>
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
            <p className="text-[11px] text-slate-400 mt-2">Monthly breakdown is modeled from the annual chronic-absenteeism rate; connect a SIS for actual daily counts.</p>
          </SectionCard>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionCard title="Attendance Risk" subtitle="Students needing attention" icon={AlertTriangle}>
            <div className="space-y-3">
              <RiskRow label="Chronically absent" value={chronicStudents} color="#EF4444" />
              <RiskRow label="Approaching threshold" value={approaching} color="#F59E0B" />
              <RiskRow label="On track" value={school.enrollment != null && chronicStudents != null ? school.enrollment - chronicStudents : null} color="#10B981" />
            </div>
            <p className="text-[11px] text-slate-400 mt-4">Derived from enrollment × chronic-absenteeism rate. Student-level risk lists require SIS integration.</p>
          </SectionCard>
        </FadeIn>
      </div>

      <FadeIn delay={180}>
        <SectionCard title="Attendance by Grade" subtitle="Average attendance by grade level (modeled)" icon={Users}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(school.school_type === "High" ? ["9", "10", "11", "12"] : school.school_type === "Middle" ? ["6", "7", "8"] : ["K", "1", "2", "3", "4", "5"]).slice(0, 6).map((g, i) => {
              const v = Math.round((attendancePct - 0.5 + (i % 2) * 0.8) * 10) / 10;
              return (
                <div key={g} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Grade {g}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{v}%</p>
                </div>
              );
            })}
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