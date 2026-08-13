import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function ClassGradesExportButton({ className, students, attainment }) {
  const downloadGrades = () => {
    const names = new Map(students.map((student) => [student.student_id, student.student_name]));
    const rows = [
      ["Student Name", "Student ID", "Assessment", "Type", "Date", "Subject", "Score", "Max Score", "Percentage", "Letter Grade", "Submission Status"],
      ...attainment.map((record) => {
        const percentage = typeof record.score === "number" ? Math.round((record.score / (record.max_score || 100)) * 100) : "";
        return [names.get(record.student_id) || "", record.student_id, record.assessment_name, record.assignment_type, record.date, record.subject, record.score, record.max_score || 100, percentage, record.letter_grade, record.submission_status];
      }),
    ];
    const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${className.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-student-grades.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <Button onClick={downloadGrades} variant="outline" size="sm" disabled={attainment.length === 0}><Download className="w-4 h-4 mr-1.5" /> Download Grades</Button>;
}