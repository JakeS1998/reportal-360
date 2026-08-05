import { useMemo } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { generateStudentRoster } from "@/lib/sampleStudentData";

function applyFilters(rows, filters) {
  return rows.filter((r) => {
    if (filters.grade !== "All Grades" && r.grade_level !== filters.grade.replace("Grade ", "")) return false;
    if (filters.gender !== "All Gender" && r.gender !== filters.gender) return false;
    if (filters.studentGroup === "Economically Disadvantaged" && !r.economically_disadvantaged) return false;
    if (filters.studentGroup === "Students with Disabilities" && !r.disability) return false;
    if (filters.studentGroup === "English Learners" && !r.english_learner) return false;
    return true;
  });
}

function avg(arr) {
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
}

function avgScores(students) {
  return {
    math: avg(students.map((r) => r.scores.Math).filter((v) => v != null)),
    reading: avg(students.map((r) => r.scores.Reading).filter((v) => v != null)),
    science: avg(students.map((r) => r.scores.Science).filter((v) => v != null)),
    attendance: avg(students.map((r) => r.attendanceRate).filter((v) => v != null)),
  };
}

export function useStudentMetrics() {
  const { activeSchool, loading, filters } = useSchool();

  const filtered = useMemo(() => {
    if (!activeSchool) return [];
    return applyFilters(generateStudentRoster(activeSchool), filters);
  }, [activeSchool, filters]);

  const prev = useMemo(() => {
    if (!activeSchool) return null;
    const prevSchool = { ...activeSchool, year: String(parseInt(activeSchool.year || "2026") - 1) };
    const pf = applyFilters(generateStudentRoster(prevSchool), filters);
    const total = pf.length;
    const attVals = pf.map((r) => r.attendanceRate).filter((v) => v != null);
    const chronic = pf.filter((r) => r.attendanceRate < 90).length;
    return {
      total,
      avgAttendance: avg(attVals),
      chronic,
      chronicRate: total ? Math.round((chronic / total) * 1000) / 10 : null,
      econDisadvantaged: pf.filter((r) => r.economically_disadvantaged).length,
      proficiency: avgScores(pf),
    };
  }, [activeSchool, filters]);

  return useMemo(() => {
    const total = filtered.length;

    const raceCounts = {};
    filtered.forEach((r) => {
      const race = r.race_ethnicity || "Unknown";
      raceCounts[race] = (raceCounts[race] || 0) + 1;
    });
    const race = Object.entries(raceCounts).map(([label, count]) => ({
      label, count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    const subgroups = [
      { label: "All Students", count: total },
      { label: "Economically Disadvantaged", count: filtered.filter((r) => r.economically_disadvantaged).length },
      { label: "English Learners", count: filtered.filter((r) => r.english_learner).length },
      { label: "Students with Disabilities", count: filtered.filter((r) => r.disability).length },
      { label: "Male", count: filtered.filter((r) => r.gender === "Male").length },
      { label: "Female", count: filtered.filter((r) => r.gender === "Female").length },
    ];

    const proficiency = avgScores(filtered);

    const matrixRows = [
      { name: "All Students", filter: () => true },
      { name: "Economically Disadvantaged", filter: (r) => r.economically_disadvantaged },
      { name: "Non-Economically Disadvantaged", filter: (r) => !r.economically_disadvantaged },
      { name: "Students with Disabilities", filter: (r) => r.disability },
      { name: "English Learners", filter: (r) => r.english_learner },
      { name: "General Education", filter: (r) => !r.disability },
      { name: "Male", filter: (r) => r.gender === "Male" },
      { name: "Female", filter: (r) => r.gender === "Female" },
    ].map(({ name, filter }) => {
      const s = avgScores(filtered.filter(filter));
      const growth = s.math != null && s.reading != null && s.science != null
        ? Math.round(((s.math + s.reading + s.science) / 3) * 10) / 10 : null;
      return { name, math: s.math, reading: s.reading, science: s.science, growth, attendance: s.attendance };
    });

    const gradeLevels = [...new Set(filtered.map((r) => r.grade_level))].sort((a, b) => Number(a) - Number(b));
    const gradeBreakdown = gradeLevels.map((g) => {
      const s = avgScores(filtered.filter((r) => r.grade_level === g));
      return { grade: `Grade ${g}`, Math: s.math, Reading: s.reading, Science: s.science };
    });

    const chronic = filtered.filter((r) => r.attendanceRate < 90).length;
    const approaching = filtered.filter((r) => r.attendanceRate >= 90 && r.attendanceRate < 95).length;
    const onTrack = filtered.filter((r) => r.attendanceRate >= 95).length;

    const attendanceByGrade = gradeLevels.map((g) => {
      const vals = filtered.filter((r) => r.grade_level === g).map((r) => r.attendanceRate).filter((v) => v != null);
      return { grade: g, attendance: avg(vals) };
    });

    const subjEntries = [
      { subject: "Math", value: proficiency.math },
      { subject: "Reading", value: proficiency.reading },
      { subject: "Science", value: proficiency.science },
    ].filter((r) => r.value != null);
    const rankings = subjEntries
      .sort((a, b) => b.value - a.value)
      .map((r, i) => {
        const prevVal = prev?.proficiency ? prev.proficiency[r.subject.toLowerCase()] : null;
        let movement = "same";
        if (prevVal != null) {
          if (r.value > prevVal + 1) movement = "up";
          else if (r.value < prevVal - 1) movement = "down";
        }
        return { rank: i + 1, subject: r.subject, value: r.value, movement };
      });

    return {
      total, roster: filtered, race, subgroups, proficiency,
      matrixRows, gradeBreakdown,
      avgAttendance: proficiency.attendance, chronic, approaching, onTrack, attendanceByGrade,
      rankings, prev, loading,
    };
  }, [filtered, prev, loading]);
}