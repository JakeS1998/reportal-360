import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

const labels = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };
const colors = { present: "bg-emerald-50 text-emerald-700", absent: "bg-rose-50 text-rose-700", late: "bg-amber-50 text-amber-700", excused: "bg-slate-100 text-slate-700" };

export default function AttendanceRecordsTable({ records, onEdit }) {
  if (!records.length) return <p className="py-12 text-center text-sm text-slate-400">No attendance records match these filters.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Class</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Submission</th><th className="px-4 py-3" /></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 text-slate-600">{record.date}</td><td className="px-4 py-3 font-medium text-slate-800">{record.student_name}</td><td className="px-4 py-3 text-slate-600">{record.class_name}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[record.status]}`}>{labels[record.status]}</span></td><td className="px-4 py-3 text-xs text-slate-500">{record.submitted ? "Submitted" : "Draft"}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => onEdit(record)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button></td></tr>)}</tbody></table></div>;
}