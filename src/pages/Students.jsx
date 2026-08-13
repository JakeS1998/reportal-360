import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import StudentRosterTable from "@/components/StudentRosterTable";
import StudentToolbar from "@/components/StudentToolbar";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import KpiCard from "@/components/KpiCard";
import TeacherStudents from "@/components/TeacherStudents";
import { Users } from "lucide-react";

export default function Students() {
  const { activeSchool, loading, filters, isTeacher, user } = useSchool();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [homerooms, setHomerooms] = useState([]);
  const [homeroomByStudentNumber, setHomeroomByStudentNumber] = useState({});
  const [studentIdsByNumber, setStudentIdsByNumber] = useState({});
  const [students, setStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  const rows = useMemo(() => students.map((student) => ({
    ...student,
    scores: student.scores || {},
    grades: student.grades || {},
    attendanceRate: student.attendanceRate ?? null,
  })), [students]);

  // Merge real homeroom assignments (stored on the Homeroom entity's student_ids)
  // into the roster rows by matching the real Student record's student_number.
  useEffect(() => {
    if (!activeSchool?.school_code) return;
    let active = true;
    setRosterLoading(true);
    (async () => {
      try {
        const [hrRes, studentsRes] = await Promise.all([
          base44.entities.Homeroom.filter({ school_code: activeSchool.school_code }, "homeroom_name", 200),
          base44.functions.invoke("manageStudents", {
            action: "list",
            caller_username: user?.username,
            caller_password: user?.password || localStorage.getItem("userPassword") || "",
            school_code: activeSchool.school_code,
          }),
        ]);
        if (!active) return;
        setHomerooms(hrRes);
        setStudents(studentsRes.data?.students || []);
        const idToNumber = {};
        const profileIds = {};
        (studentsRes.data?.students || []).forEach((s) => {
          if (s.student_number) {
            idToNumber[s.id] = s.student_number;
            profileIds[s.student_number] = s.id;
          }
        });
        setStudentIdsByNumber(profileIds);
        const map = {};
        hrRes.forEach((h) => {
          (h.student_ids || []).forEach((sid) => {
            const num = idToNumber[sid];
            if (num) map[num] = h.homeroom_name;
          });
        });
        setHomeroomByStudentNumber(map);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setRosterLoading(false);
      }
    })();
    return () => { active = false; };
  }, [activeSchool?.school_code, user?.username]);

  const rowsWithHomeroom = useMemo(
    () => rows.map((r) => ({
      ...r,
      homeroom: homeroomByStudentNumber[r.student_number] || "",
      profileId: studentIdsByNumber[r.student_number],
    })),
    [rows, homeroomByStudentNumber, studentIdsByNumber]
  );

  const homeroomOptions = useMemo(
    () => ["All Homerooms", ...homerooms.map((h) => h.homeroom_name).filter(Boolean).sort()],
    [homerooms]
  );

  if (isTeacher) return <TeacherStudents />;

  const filteredRows = rowsWithHomeroom.filter((r) => {
    if (filters.grade !== "All Grades" && r.grade_level !== filters.grade.replace("Grade ", "")) return false;
    if (filters.gender !== "All Gender" && r.gender !== filters.gender) return false;
    if (filters.studentGroup === "Economically Disadvantaged" && !r.economically_disadvantaged) return false;
    if (filters.studentGroup === "Students with Disabilities" && !r.disability) return false;
    if (filters.studentGroup === "English Learners" && !r.english_learner) return false;
    if (filters.homeroom && filters.homeroom !== "All Homerooms" && r.homeroom !== filters.homeroom) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.student_name.toLowerCase().includes(q) && !r.student_number.toLowerCase().includes(q)) return false;
    }
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

  if (loading || rosterLoading || !activeSchool) {
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
          <StudentToolbar search={search} onSearch={setSearch} homeroomOptions={homerooms.length ? homeroomOptions : null} />
          <StudentRosterTable
            rows={filteredRows}
            subjectFilter={filters.subject}
            onSelect={(student) => navigate(`/students/${student.profileId || `sample-${student.student_number}`}`)}
          />
        </SectionCard>
      </FadeIn>
    </div>
  );
}