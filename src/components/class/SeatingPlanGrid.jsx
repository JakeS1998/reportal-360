import React from "react";

export default function SeatingPlanGrid({ students, seats, columns, layoutType, clusterSize, pendingStudentId, onSeatClick }) {
  const byPosition = new Map(seats.map((seat) => [`${seat.row}-${seat.column}`, seat.student_id]));
  const rows = Math.max(1, Math.ceil(students.length / columns), ...seats.map((seat) => seat.row + 1));
  const studentById = new Map(students.map((student) => [student.student_id, student]));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Front of classroom</p>
      <div className={`grid ${layoutType === "clusters" ? "gap-x-6 gap-y-5" : layoutType === "individual" ? "gap-4" : "gap-2"}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * columns }, (_, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          const studentId = byPosition.get(`${row}-${column}`);
          const student = studentById.get(studentId);
          const selected = studentId === pendingStudentId;
          return (
            <button key={`${row}-${column}`} onClick={() => onSeatClick(row, column)} className={`min-h-20 rounded-lg border p-2 text-left transition-colors ${layoutType === "clusters" && (column + 1) % clusterSize === 0 ? "border-r-4 border-r-slate-300" : ""} ${selected ? "border-slate-900 bg-slate-900 text-white" : student ? "border-blue-200 bg-white text-slate-700 hover:border-blue-400" : "border-dashed border-slate-300 bg-white/60 text-slate-400 hover:border-slate-400"}`}>
              {student ? <><p className="text-xs font-semibold leading-tight">{student.student_name}</p><p className={`mt-1 text-[10px] ${selected ? "text-slate-300" : "text-slate-400"}`}>Seat {index + 1}</p></> : <span className="text-xs">Empty seat</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}