import React from "react";
import { ChevronRight } from "lucide-react";

function scoreColor(score) {
  if (score == null) return "text-slate-300";
  if (score >= 80) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function gradeStyle(grade) {
  switch (grade) {
    case "A": return "bg-emerald-100 text-emerald-700";
    case "B": return "bg-blue-100 text-blue-700";
    case "C": return "bg-amber-100 text-amber-700";
    case "D": return "bg-orange-100 text-orange-700";
    case "F": return "bg-rose-100 text-rose-700";
    default: return "bg-slate-100 text-slate-500";
  }
}

function Badge({ children, color, tooltip }) {
  const [show, setShow] = React.useState(false);
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-help ${colors[color] || colors.amber}`}>
        {children}
      </span>
      {tooltip && show && (
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-medium text-white shadow-lg z-50 leading-relaxed text-center">
          {tooltip}
        </span>
      )}
    </span>
  );
}

function ScoreCell({ score, grade, highlight }) {
  if (score == null) return <span className="text-slate-300">—</span>;
  return (
    <div className={`inline-flex items-center gap-1.5 ${highlight ? "ring-2 ring-blue-200 rounded-lg px-1.5 py-0.5" : ""}`}>
      <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
      <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${gradeStyle(grade)}`}>{grade}</span>
    </div>
  );
}

export default function StudentRosterTable({ rows, subjectFilter, onSelect, selectedIds, onToggle }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400 py-8 text-center">No students found for the current filters.</p>;
  }
  const subjects = ["Math", "Reading", "Science"];
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
            {onToggle && <th className="px-4 py-3"><input type="checkbox" checked={rows.length > 0 && rows.every((row) => selectedIds?.includes(row.id))} onChange={(event) => rows.forEach((row) => onToggle(row.id, event.target.checked))} /></th>}<th className="px-4 py-3">Student</th>
            <th className="px-3 py-3">ID</th>
            <th className="px-3 py-3">Grade</th>
            <th className="px-3 py-3">Homeroom</th>
            <th className="px-3 py-3">Gender</th>
            <th className="px-3 py-3">Race/Ethnicity</th>
            <th className="px-3 py-3">Subgroups</th>
            <th className="px-3 py-3 text-center">Math</th>
            <th className="px-3 py-3 text-center">Reading</th>
            <th className="px-3 py-3 text-center">Science</th>
            <th className="px-3 py-3 text-center">Attendance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_number} onClick={() => onSelect?.(r)} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer group">
              {onToggle && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds?.includes(r.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => onToggle(r.id, event.target.checked)} /></td>}<td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  {r.student_name}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </td>
              <td className="px-3 py-3 text-slate-500 font-mono text-xs">{r.student_number}</td>
              <td className="px-3 py-3 text-slate-600">{r.grade_level}</td>
              <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.homeroom || "—"}</td>
              <td className="px-3 py-3 text-slate-600">{r.gender || "—"}</td>
              <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.race_ethnicity || "—"}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {r.economically_disadvantaged && <Badge color="amber" tooltip="Economically Disadvantaged — Student qualifies for free or reduced-price meals based on household income eligibility.">Econ Disadv</Badge>}
                  {r.english_learner && <Badge color="blue" tooltip="English Language Learner — Student is receiving English language support services to develop academic proficiency.">ELL</Badge>}
                  {r.disability && <Badge color="purple" tooltip="Student with Disabilities — Student has an Individualized Education Program (IEP) or receives special education services.">SWD</Badge>}
                  {!r.economically_disadvantaged && !r.english_learner && !r.disability && <span className="text-xs text-slate-300">—</span>}
                </div>
              </td>
              {subjects.map((subj) => (
                <td key={subj} className="px-3 py-3 text-center">
                  <ScoreCell score={r.scores[subj]} grade={r.grades[subj]} highlight={subjectFilter === subj} />
                </td>
              ))}
              <td className="px-3 py-3 text-center">
                {r.attendanceRate != null ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700">
                    {r.attendanceRate}%
                  </span>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}