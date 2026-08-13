import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClassroomDesigner from "@/components/class/ClassroomDesigner";
import ClassAttendanceManager from "@/components/class/ClassAttendanceManager";
import ClassAssessmentManager from "@/components/class/ClassAssessmentManager";
import ClassBehaviourManager from "@/components/class/ClassBehaviourManager";
import { ArrowLeft, CalendarCheck, GraduationCap, Plus, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";

const makeId = () => `seat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const uShapeSeats = (count) => {
  const positions = [
    ...[18, 30, 42, 54, 66].map((y) => [7, y]),
    ...[18, 30, 42, 54, 66].map((y) => [84, y]),
    ...[28, 40, 52, 64, 76].map((x) => [x, 28]),
    ...[28, 40, 52, 64, 76].map((x) => [x, 48]),
    ...[8, 20, 32, 44, 56, 68, 80, 92].map((x) => [x, 76]),
  ];
  return positions.slice(0, Math.max(count, 1)).map(([x, y]) => ({ seat_id: makeId(), x, y }));
};

export default function SeatingPlan() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useSchool();
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [action, setAction] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [cls, enrollments, plans, schedules] = await Promise.all([
        base44.entities.Class.get(classId),
        base44.entities.StudentClass.filter({ class_id: classId, status: "active" }, "student_name", 500),
        base44.entities.SeatingPlan.filter({ class_id: classId }, "-updated_date", 1),
        base44.entities.ClassSchedule.filter({ class_id: classId }, undefined, 200),
      ]);
      const savedPlan = plans[0] || null;
      setClassInfo(cls);
      setStudents(enrollments);
      setPlan(savedPlan);
      const savedSeats = savedPlan?.seats || [];
      const normalizedSeats = savedSeats.map((seat, index) => ({
        seat_id: seat.seat_id || makeId(),
        student_id: seat.student_id,
        x: typeof seat.x === "number" ? seat.x : 7 + ((seat.column || 0) * 11),
        y: typeof seat.y === "number" ? seat.y : 18 + ((seat.row || 0) * 14),
      }));
      setSeats(normalizedSeats.length ? normalizedSeats : uShapeSeats(enrollments.length));
      const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
      setScheduleId(schedules.find((item) => item.day_of_week === day)?.id || `manual-${classId}`);
    };
    load();
  }, [classId]);

  const selectedSeat = seats.find((seat) => seat.seat_id === selectedSeatId);
  const selectedStudent = students.find((student) => student.student_id === selectedSeat?.student_id);
  const assignedIds = useMemo(() => new Set(seats.map((seat) => seat.student_id).filter(Boolean)), [seats]);
  const unassigned = students.filter((student) => !assignedIds.has(student.student_id));

  const updateSeat = (seatId, patch) => setSeats((current) => current.map((seat) => seat.seat_id === seatId ? { ...seat, ...patch } : seat));
  const assignStudent = (studentId) => {
    if (!selectedSeatId) return;
    setSeats((current) => current.map((seat) => seat.seat_id === selectedSeatId ? { ...seat, student_id: studentId || undefined } : seat.student_id === studentId ? { ...seat, student_id: undefined } : seat));
  };
  const addSeat = () => {
    const seat = { seat_id: makeId(), x: 45, y: 55 };
    setSeats((current) => [...current, seat]);
    setSelectedSeatId(seat.seat_id);
  };
  const removeSeat = () => {
    if (!selectedSeatId) return;
    setSeats((current) => current.filter((seat) => seat.seat_id !== selectedSeatId));
    setSelectedSeatId(null);
  };
  const resetUShape = () => { setSeats(uShapeSeats(students.length)); setSelectedSeatId(null); };
  const savePlan = async () => {
    if (!classInfo) return;
    setSaving(true);
    const payload = { class_id: classId, school_code: classInfo.school_code, name: "Current seating plan", seats };
    if (plan) await base44.entities.SeatingPlan.update(plan.id, payload);
    else setPlan(await base44.entities.SeatingPlan.create(payload));
    setSaving(false);
  };

  if (!classInfo) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;

  return <div className="space-y-6">
    <button onClick={() => navigate(`/classes/${classId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Back to class</button>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Classroom designer</h2><p className="text-sm text-slate-500">{classInfo.class_name} · drag desks anywhere, then choose a desk to assign a student.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={resetUShape}><RotateCcw className="mr-1 h-4 w-4" /> U-shape</Button><Button size="sm" onClick={savePlan} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save plan"}</Button></div></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><ClassroomDesigner seats={seats} students={students} selectedSeatId={selectedSeatId} onSelectSeat={setSelectedSeatId} onMoveSeat={(seatId, x, y) => updateSeat(seatId, { x, y })} /><aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><div><h3 className="text-sm font-semibold text-slate-800">Layout tools</h3><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={addSeat}><Plus className="mr-1 h-4 w-4" /> Add desk</Button><Button size="sm" variant="outline" disabled={!selectedSeat} onClick={removeSeat}><Trash2 className="mr-1 h-4 w-4" /> Remove</Button></div></div><div className="border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-800">Selected desk</h3>{selectedSeat ? <div className="mt-3 space-y-3"><select value={selectedSeat.student_id || ""} onChange={(event) => assignStudent(event.target.value)} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Unassigned</option>{students.filter((student) => !assignedIds.has(student.student_id) || student.student_id === selectedSeat.student_id).map((student) => <option key={student.student_id} value={student.student_id}>{student.student_name}</option>)}</select>{selectedStudent && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setAction("attendance")}><CalendarCheck className="mr-1 h-4 w-4" /> Attendance</Button><Button size="sm" variant="outline" onClick={() => setAction("grade")}><GraduationCap className="mr-1 h-4 w-4" /> Grade</Button><Button size="sm" variant="outline" onClick={() => setAction("behaviour")}><ShieldAlert className="mr-1 h-4 w-4" /> Behaviour</Button></div>}</div> : <p className="mt-2 text-sm text-slate-400">Select a desk to assign or manage it.</p>}</div><div className="border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-800">Unassigned students</h3><div className="mt-2 space-y-1">{unassigned.map((student) => <button key={student.student_id} disabled={!selectedSeat} onClick={() => assignStudent(student.student_id)} className="w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{student.student_name}</button>)}{unassigned.length === 0 && <p className="text-sm text-slate-400">All students have a desk.</p>}</div></div></aside></div>
    <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{action === "attendance" ? "Attendance" : action === "grade" ? "Grade" : "Behaviour"} · {selectedStudent?.student_name}</DialogTitle></DialogHeader>{action === "attendance" && <ClassAttendanceManager classId={classId} scheduleId={scheduleId} students={selectedStudent ? [selectedStudent] : []} user={user} onSaved={() => setAction(null)} />}{action === "grade" && <ClassAssessmentManager classId={classId} students={selectedStudent ? [selectedStudent] : []} onSaved={() => setAction(null)} />}{action === "behaviour" && <ClassBehaviourManager classId={classId} students={selectedStudent ? [selectedStudent] : []} user={user} onSaved={() => setAction(null)} />}</DialogContent></Dialog>
  </div>;
}