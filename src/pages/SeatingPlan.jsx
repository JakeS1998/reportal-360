import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SeatingPlanGrid from "@/components/class/SeatingPlanGrid";
import ClassAttendanceManager from "@/components/class/ClassAttendanceManager";
import ClassAssessmentManager from "@/components/class/ClassAssessmentManager";
import ClassBehaviourManager from "@/components/class/ClassBehaviourManager";
import { ArrowLeft, Armchair, CalendarCheck, GraduationCap, ShieldAlert, Shuffle, Save } from "lucide-react";

export default function SeatingPlan() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useSchool();
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [seats, setSeats] = useState([]);
  const [columns, setColumns] = useState(6);
  const [layoutType, setLayoutType] = useState("rows");
  const [clusterSize, setClusterSize] = useState(4);
  const [selectedId, setSelectedId] = useState(null);
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
      setClassInfo(cls);
      setStudents(enrollments);
      const savedPlan = plans[0] || null;
      setPlan(savedPlan);
      setSeats(savedPlan?.seats || []);
      setColumns(savedPlan?.columns || 6);
      setLayoutType(savedPlan?.layout_type || "rows");
      setClusterSize(savedPlan?.cluster_size || 4);
      const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
      setScheduleId(schedules.find((item) => item.day_of_week === day)?.id || `manual-${classId}`);
    };
    load();
  }, [classId]);

  const seatedIds = useMemo(() => new Set(seats.map((seat) => seat.student_id)), [seats]);
  const selectedStudent = students.find((student) => student.student_id === selectedId);
  const unseated = students.filter((student) => !seatedIds.has(student.student_id));

  const autoArrange = () => {
    setSeats(students.map((student, index) => ({ student_id: student.student_id, row: Math.floor(index / columns), column: index % columns })));
    setSelectedId(null);
  };

  const handleSeatClick = (row, column) => {
    const target = seats.find((seat) => seat.row === row && seat.column === column);
    if (!selectedId && target) return setSelectedId(target.student_id);
    if (!selectedId) return;
    const current = seats.find((seat) => seat.student_id === selectedId);
    setSeats((currentSeats) => currentSeats.filter((seat) => seat.student_id !== selectedId && !(seat.row === row && seat.column === column)).concat({ student_id: selectedId, row, column }, target && current ? [{ ...target, row: current.row, column: current.column }] : []));
    setSelectedId(null);
  };

  const savePlan = async () => {
    if (!classInfo) return;
    setSaving(true);
    const payload = { class_id: classId, school_code: classInfo.school_code, name: "Current seating plan", layout_type: layoutType, columns, cluster_size: clusterSize, seats };
    if (plan) await base44.entities.SeatingPlan.update(plan.id, payload);
    else setPlan(await base44.entities.SeatingPlan.create(payload));
    setSaving(false);
  };

  if (!classInfo) return <div className="animate-pulse h-64 rounded-xl bg-slate-100" />;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/classes/${classId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Back to class</button>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Seating plan</h2><p className="text-sm text-slate-500">{classInfo.class_name} · select a student, then select a seat to place or move them.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={autoArrange}><Shuffle className="mr-1 h-4 w-4" /> Auto-arrange</Button><Button size="sm" onClick={savePlan} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save plan"}</Button></div></div>
      <div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-600">Layout</label><select value={layoutType} onChange={(event) => setLayoutType(event.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="rows">Rows</option><option value="clusters">Clusters</option><option value="individual">Individual seats</option></select><label className="text-sm text-slate-600">Seats across</label><select value={columns} onChange={(event) => setColumns(Number(event.target.value))} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">{[4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select>{layoutType === "clusters" && <><label className="text-sm text-slate-600">Cluster size</label><select value={clusterSize} onChange={(event) => setClusterSize(Number(event.target.value))} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">{[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></>}</div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]"><SeatingPlanGrid students={students} seats={seats} columns={columns} layoutType={layoutType} clusterSize={clusterSize} pendingStudentId={selectedId} onSeatClick={handleSeatClick} /><aside className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center gap-2"><Armchair className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Unseated students</h3></div><div className="space-y-1">{unseated.map((student) => <button key={student.student_id} onClick={() => setSelectedId(student.student_id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selectedId === student.student_id ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"}`}>{student.student_name}</button>)}{unseated.length === 0 && <p className="text-sm text-slate-400">Everyone is seated.</p>}</div></aside></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-800">Student actions</p>{selectedStudent ? <div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-2 text-sm text-slate-600">{selectedStudent.student_name}</span><Button size="sm" variant="outline" onClick={() => setAction("attendance")}><CalendarCheck className="mr-1 h-4 w-4" /> Attendance</Button><Button size="sm" variant="outline" onClick={() => setAction("grade")}><GraduationCap className="mr-1 h-4 w-4" /> Grade</Button><Button size="sm" variant="outline" onClick={() => setAction("behaviour")}><ShieldAlert className="mr-1 h-4 w-4" /> Behaviour</Button></div> : <p className="mt-1 text-sm text-slate-400">Select a seated student to use the quick actions.</p>}</div>
      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{action === "attendance" ? "Attendance" : action === "grade" ? "Grade" : "Behaviour"} · {selectedStudent?.student_name}</DialogTitle></DialogHeader>{action === "attendance" && <ClassAttendanceManager classId={classId} scheduleId={scheduleId} students={selectedStudent ? [selectedStudent] : []} user={user} onSaved={() => setAction(null)} />}{action === "grade" && <ClassAssessmentManager classId={classId} students={selectedStudent ? [selectedStudent] : []} onSaved={() => setAction(null)} />}{action === "behaviour" && <ClassBehaviourManager classId={classId} students={selectedStudent ? [selectedStudent] : []} user={user} onSaved={() => setAction(null)} />}</DialogContent></Dialog>
    </div>
  );
}