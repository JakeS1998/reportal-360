import React, { useMemo } from "react";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import StudentRosterTable from "@/components/StudentRosterTable";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import KpiCard from "@/components/KpiCard";
import { generateStudentRoster, SUBJECTS } from "@/lib/sampleStudentData";
import { Users } from "lucide-react";

export default function Students() {
  const { activeSchool, loading, filters } = useSchool();

  const rows = useMemo(() => {
    if (!activeSchool) return [];
    return generateStudentRoster(activeSchool);
  }, [activeSchool]);

  const filteredRows = rows.filter((r) => {
    if (filters.grade !== "All Grades" && r.grade_level !== filters.grade.replace("Grade ", "")) return false;
    if (filters.gender !== "All Gender" && r.gender !== filters.gender) return false;
    if (filters.studentGroup === "Economically Disadvantaged" && !r.economically_disadvantaged) return false;
    if (filters.studentGroup === "Students with Disabilities" && !r.disability) return false;
    if (filters.studentGroup === "English Learners" && !r.english_learner) return false;
    return true;
  });

  const avg = (subj) => {
    const vals = filteredRows.map((r) => r.scores[subj]).filter((v) => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const attAvg = () => {
    const vals = filteredRows.map((r) => r.attendanceRate).filter((v) => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  if (loading || !activeSchool) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard label="Total Students" value={filteredRows.length} accent="#1D4ED8" tooltip="Number of students matching current filters." />
          <KpiCard label="Avg Math Score" value={avg("Math")} accent="#1D4ED8" tooltip="Average Math benchmark score (Q1) across matched students." />
          <KpiCard label="Avg Reading Score" value={avg("Reading")} accent="#7C3AED" tooltip="Average Reading benchmark score (Q1) across matched students." />
          <KpiCard label="Avg Science Score" value={avg("Science")} accent="#10B981" tooltip="Average Science benchmark score (Q1) across matched students." />
          <KpiCard label="Attendance Rate" value={attAvg()} suffix="%" accent="#F59E0B" tooltip="Average attendance rate across matched students." />
        </div>
      </FadeIn>
      <FadeIn delay={60}>
        <SectionCard title="Student Roster" subtitle={`${filteredRows.length} students · ${activeSchool?.school_name || ""} · FY ${activeSchool?.year || ""}`} icon={Users}>
          <StudentRosterTable rows={filteredRows} subjectFilter={filters.subject} />
        </SectionCard>
      </FadeIn>
    </div>
  );
}