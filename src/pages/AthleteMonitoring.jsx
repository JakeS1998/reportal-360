import React, { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import AthleteMonitoringTable from "@/components/athletics/AthleteMonitoringTable";
import AthleteMonitoringFilters from "@/components/athletics/AthleteMonitoringFilters";

export default function AthleteMonitoring() {
  const { school, user } = useSchool(); const schoolCode = school?.school_code || user?.school_code; const [rows, setRows] = useState(null); const [search, setSearch] = useState(""); const [team, setTeam] = useState(""); const [status, setStatus] = useState("");
  useEffect(() => {
    if (!schoolCode) return;
    const loadMonitoring = async () => {
      const [teams, members, students] = await Promise.all([
        base44.entities.AthleticsTeam.filter({ school_code: schoolCode }),
        base44.entities.AthleticsTeamMember.filter({ school_code: schoolCode }),
        base44.entities.Student.filter({ school_code: schoolCode }),
      ]);
      const attendance = await base44.entities.AttendanceRecord.list();
      const attainment = await base44.entities.AttainmentRecord.list();
      const nextRows = members.map((member) => {
        const student = students.find((item) => item.id === member.student_id);
        const team = teams.find((item) => item.id === member.team_id);
        if (!student || !team) return null;
        const studentAttendance = attendance.filter((item) => item.student_id === student.id);
        const studentGrades = attainment.filter((item) => item.student_id === student.id);
        const attendanceRate = studentAttendance.length ? Math.round(studentAttendance.filter((item) => item.status === "present" || item.status === "late").length / studentAttendance.length * 100) : null;
        const average = studentGrades.length ? Math.round(studentGrades.reduce((sum, item) => sum + item.score / (item.max_score || 100) * 100, 0) / studentGrades.length) : null;
        return { student, team, attendance: attendanceRate, average, onTrack: (attendanceRate === null || attendanceRate >= 90) && (average === null || average >= 70) };
      }).filter(Boolean);
      setRows(nextRows);
    };
    loadMonitoring();
  }, [schoolCode]);
  if (!rows) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const reviewCount = rows.filter((row) => !row.onTrack).length;
  const teams = [...new Set(rows.map((row) => row.team.name))].sort();
  const visibleRows = rows.filter((row) => row.student.student_name.toLowerCase().includes(search.toLowerCase()) && (!team || row.team.name === team) && (!status || (status === "on-track" ? row.onTrack : !row.onTrack)));
  const clearFilters = () => { setSearch(""); setTeam(""); setStatus(""); };
  return <div className="space-y-6"><div><div className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-rose-700" /><h1 className="text-2xl font-bold text-slate-900">Athlete monitoring</h1></div><p className="mt-1 text-sm text-slate-500">Review academic and attendance progress for every student on an athletics roster.</p></div><div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><strong className="text-slate-900">Eligibility guide:</strong> athletes are marked for review below 70% academic average or 90% attendance. {reviewCount ? `${reviewCount} athlete${reviewCount === 1 ? "" : "s"} currently need review.` : "All monitored athletes are currently on track."}</div><AthleteMonitoringFilters search={search} team={team} status={status} teams={teams} onSearchChange={setSearch} onTeamChange={setTeam} onStatusChange={setStatus} onClear={clearFilters} /><AthleteMonitoringTable rows={visibleRows} isFiltered={Boolean(search || team || status)} /></div>;
}