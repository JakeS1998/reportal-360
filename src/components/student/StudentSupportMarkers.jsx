import React from "react";

export default function StudentSupportMarkers({ student, className = "" }) {
  if (!student?.section_504_plan && !student?.iep_on_file) return null;
  return <span className={`inline-flex items-center gap-1 ${className}`}>{student.section_504_plan && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">504</span>}{student.iep_on_file && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">IEP</span>}</span>;
}