import React, { useEffect, useRef } from "react";
import { Armchair, GripVertical } from "lucide-react";

export default function ClassroomDesigner({ seats, students, selectedSeatId, onSelectSeat, onMoveSeat }) {
  const canvasRef = useRef(null);
  const draggingRef = useRef(null);
  const studentById = new Map(students.map((student) => [student.student_id, student]));

  useEffect(() => {
    const move = (event) => {
      if (!draggingRef.current || !canvasRef.current) return;
      const bounds = canvasRef.current.getBoundingClientRect();
      const snap = (value) => Math.round(value / 6) * 6;
      const x = Math.max(2, Math.min(86, snap(((event.clientX - bounds.left) / bounds.width) * 100 - draggingRef.current.offsetX)));
      const y = Math.max(10, Math.min(82, snap(((event.clientY - bounds.top) / bounds.height) * 100 - draggingRef.current.offsetY)));
      onMoveSeat(draggingRef.current.id, x, y);
    };
    const end = () => { draggingRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
  }, [onMoveSeat]);

  const startDrag = (event, seat) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    draggingRef.current = { id: seat.seat_id, offsetX: ((event.clientX - bounds.left) / bounds.width) * 100 - seat.x, offsetY: ((event.clientY - bounds.top) / bounds.height) * 100 - seat.y };
    onSelectSeat(seat.seat_id);
  };

  return <div ref={canvasRef} className="relative min-h-[620px] overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 shadow-inner">
    <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-lg bg-sky-500 px-12 py-3 text-center text-sm font-bold text-white shadow-sm">Teacher desk</div>
    <p className="absolute left-1/2 top-24 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Front of classroom</p>
    {seats.map((seat) => {
      const student = studentById.get(seat.student_id);
      const selected = seat.seat_id === selectedSeatId;
      return <button key={seat.seat_id} onPointerDown={(event) => startDrag(event, seat)} className={`absolute flex h-20 w-28 touch-none select-none flex-col justify-center rounded-lg border-2 px-3 text-left shadow-sm ${selected ? "border-sky-600 bg-sky-600 text-white" : student ? "border-sky-300 bg-white text-slate-800" : "border-dashed border-slate-300 bg-white text-slate-400"}`} style={{ left: `${seat.x}%`, top: `${seat.y}%` }}>
        <GripVertical className={`absolute right-1 top-1 h-3.5 w-3.5 ${selected ? "text-sky-200" : "text-slate-300"}`} />
        <Armchair className={`mb-1 h-4 w-4 ${selected ? "text-sky-100" : "text-sky-500"}`} />
        <span className="truncate text-xs font-semibold">{student?.student_name || "Empty seat"}</span>
      </button>;
    })}
  </div>;
}