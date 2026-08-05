import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import StudentRosterTable from "@/components/StudentRosterTable";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import KpiCard from "@/components/KpiCard";
import { Users } from "lucide-react";

export default function Students() {
  const { school, loading, filters } = useSchool();
  const [data, setData] = useState({ loading: true });

  useEffect(() => {
    if (!school || !school.school_code) return;
    setData({ loading: true });
    (async () => {
      try {
        const students = await base44.entities.Student.filter({ school_code: school.school_code });
        const ids = students.map((s) => s.student_number).filter(Boolean);
        if (!ids.length) {
          setData({ loading: false, rows: [] });
          return;
        }
        const [attainment, attendance] = await Promise.all([
          base44.entities.AttainmentRecord.filter({ student_id: { $in: ids } }),
          base44.entities.AttendanceRecord.filter({ student_id: { $in: ids } }),
        ]);

        const scoresByStudent = {};
        attainment.forEach((r) => {
          if (!scoresByStudent[r.student_id]) scoresByStudent[r.student_id] = {};
          if (!scoresByStudent[r.student_id][r.subject]) scoresByStudent[r.student_id][r.subject] = [];
          scoresByStudent[r.student_id][r.subject].push(r.score);
        });

        const attByStudent = {};
        attendance.forEach((r) => {
          if (!attByStudent[r.student_id]) attByStudent[r.student_id] = { present: 0, total: 0 };
          attByStudent[r.student_id].total++;
          if (r.status === "present" || r.status === "late") attByStudent[r.student_id].present++;
        });

        const rows = students.map((s) => {
          const scores = scoresByStudent[s.student_number] || {};
          const avg = (subj) => {
            const arr = scores[subj];
            return arr && arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
          };
          const att = attByStudent[s.student_number] || { present: 0, total: 0 };
          return {
            ...s,
            math: avg("Math"),
            reading: avg("Reading"),
            science: avg("Science"),
            attendanceRate: att.total ? Math.round((att.present / att.total) * 100) : null,
          };
        });

        setData({ loading: false, rows });
      } catch (e) {
        setData({ loading: false, error: true });
      }
    })();
  }, [school]);

  const filteredRows = (data.rows || []).filter((r) => {
    if (filters.grade !== "All Grades" && r.grade_level !== filters.grade.replace("Grade ", "")) return false;
    if (filters.gender !== "All Gender" && r.gender !== filters.gender) return false;
    if (filters.studentGroup === "Economically Disadvantaged" && !r.economically_disadvantaged) return false;
    if (filters.studentGroup === "Students with Disabilities" && !r.disability) return false;
    if (filters.studentGroup === "English Learners" && !r.english_learner) return false;
    return true;
  });

  const avg = (field) => {
    const vals = filteredRows.map((r) => r[field]).filter((v) => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const attAvg = () => {
    const vals = filteredRows.map((r) => r.attendanceRate).filter((v) => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  if (loading || data.loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (data.error) {
    return <SectionCard title="Student Roster"><p className="text-sm text-slate-400">Unable to load student data.</p></SectionCard>;
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard label="Total Students" value={filteredRows.length} accent="#1D4ED8" tooltip="Number of students matching current filters." />
          <KpiCard label="Avg Math Score" value={avg("math")} accent="#1D4ED8" tooltip="Average Math benchmark score (Q1) across matched students." />
          <KpiCard label="Avg Reading Score" value={avg("reading")} accent="#7C3AED" tooltip="Average Reading benchmark score (Q1) across matched students." />
          <KpiCard label="Avg Science Score" value={avg("science")} accent="#10B981" tooltip="Average Science benchmark score (Q1) across matched students." />
          <KpiCard label="Attendance Rate" value={attAvg()} suffix="%" accent="#F59E0B" tooltip="Average attendance rate across matched students." />
        </div>
      </FadeIn>
      <FadeIn delay={60}>
        <SectionCard title="Student Roster" subtitle={`${filteredRows.length} students · ${school?.school_name || ""}`} icon={Users}>
          <StudentRosterTable rows={filteredRows} />
        </SectionCard>
      </FadeIn>
    </div>
  );
}