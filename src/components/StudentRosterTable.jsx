import React from "react";

function scoreColor(score) {
  if (score == null) return "text-slate-300";
  if (score >= 80) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score) {
  if (score == null) return "bg-slate-50";
  if (score >= 80) return "bg-emerald-50";
  if (score >= 70) return "bg-blue-50";
  if (score >= 60) return "bg-amber-50";
  return "bg-rose-50";
}

function Badge({ children, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[color] || colors.amber}`}>{children}</span>;
}

export default function StudentRosterTable({ rows }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400 py-8 text-center">No students found for the current filters.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
            <th className="px-4 py-3">Student</th>
            <th className="px-3 py-3">ID</th>
            <th className="px-3 py-3">Grade</th>
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
            <tr key={r.id || r.student_number} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{r.student_name}</td>
              <td className="px-3 py-3 text-slate-500 font-mono text-xs">{r.student_number}</td>
              <td className="px-3 py-3 text-slate-600">{r.grade_level}</td>
              <td className="px-3 py-3 text-slate-600">{r.gender || "—"}</td>
              <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.race_ethnicity || "—"}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {r.economically_disadvantaged && <Badge color="amber">Econ Disadv</Badge>}
                  {r.english_learner && <Badge color="blue">ELL</Badge>}
                  {r.disability && <Badge color="purple">SWD</Badge>}
                  {!r.economically_disadvantaged && !r.english_learner && !r.disability && <span className="text-xs text-slate-300">—</span>}
                </div>
              </td>
              <td className={`px-3 py-3 text-center font-semibold ${scoreColor(r.math)}`}>{r.math != null ? r.math : "—"}</td>
              <td className={`px-3 py-3 text-center font-semibold ${scoreColor(r.reading)}`}>{r.reading != null ? r.reading : "—"}</td>
              <td className={`px-3 py-3 text-center font-semibold ${scoreColor(r.science)}`}>{r.science != null ? r.science : "—"}</td>
              <td className="px-3 py-3 text-center">
                {r.attendanceRate != null ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreBg(r.attendanceRate)} ${scoreColor(r.attendanceRate)}`}>
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