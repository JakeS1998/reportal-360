import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useClassManagement } from "@/lib/useClassManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Users, Upload, AlertTriangle } from "lucide-react";
import StudentImportDialog from "@/components/StudentImportDialog";

export default function StudentAssignments() {
  const cm = useClassManagement();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [search, setSearch] = useState("");
  const [fGrade, setFGrade] = useState("");
  const [fHomeroom, setFHomeroom] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selAvail, setSelAvail] = useState(() => new Set());
  const [selAssigned, setSelAssigned] = useState(() => new Set());
  const [subjectDefs, setSubjectDefs] = useState([]);

  useEffect(() => {
    base44.entities.Subject.list("name", 200).then(setSubjectDefs);
  }, []);

  useEffect(() => {
    if (selectedClass?.grade_level) setFGrade(selectedClass.grade_level);
    else setFGrade("");
    setSelAvail(new Set());
    setSelAssigned(new Set());
  }, [selectedClassId]);

  const activeClasses = useMemo(() => cm.classes.filter((c) => c.status !== "archived"), [cm.classes]);
  const selectedClass = cm.classes.find((c) => c.id === selectedClassId);

  const assignedIds = useMemo(
    () => new Set(cm.studentAssignments.filter((sa) => sa.class_id === selectedClassId && sa.status === "active").map((sa) => sa.student_id)),
    [cm.studentAssignments, selectedClassId]
  );

  const availableStudents = useMemo(() => {
    return cm.students.filter((s) => {
      if (assignedIds.has(s.id)) return false;
      if (s.status && s.status !== "active") return false;
      if (search && !s.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (fGrade && s.grade_level !== fGrade) return false;
      if (fHomeroom && s.homeroom !== fHomeroom) return false;
      return true;
    });
  }, [cm.students, assignedIds, search, fGrade, fHomeroom]);

  const assignedStudents = useMemo(() => {
    return cm.studentAssignments
      .filter((sa) => sa.class_id === selectedClassId && sa.status === "active")
      .map((sa) => cm.students.find((s) => s.id === sa.student_id))
      .filter(Boolean)
      .filter((s) => {
        if (search && !s.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (fGrade && s.grade_level !== fGrade) return false;
        if (fHomeroom && s.homeroom !== fHomeroom) return false;
        return true;
      });
  }, [cm.studentAssignments, cm.students, selectedClassId, search, fGrade, fHomeroom]);

  const coreEnrollmentGaps = useMemo(() => {
    if (subjectDefs.length === 0) return [];
    const currentYearId = cm.currentYear?.id;
    const electiveSubjects = new Set(subjectDefs.filter((subject) => subject.is_elective).map((subject) => subject.name?.trim().toLowerCase()));
    const coreClasses = activeClasses.filter((cls) => {
      const subject = cls.subject?.trim().toLowerCase();
      return cls.status === "active" && cls.grade_level && subject && subject !== "homeroom" && !electiveSubjects.has(subject) && (!currentYearId || cls.academic_year_id === currentYearId);
    });
    const requiredSubjectsByGrade = coreClasses.reduce((groups, cls) => {
      (groups[cls.grade_level] ||= new Set()).add(cls.subject.trim());
      return groups;
    }, {});
    const enrolledSubjectsByStudent = {};
    cm.studentAssignments.filter((assignment) => assignment.status === "active").forEach((assignment) => {
      const cls = coreClasses.find((item) => item.id === assignment.class_id);
      if (!cls) return;
      (enrolledSubjectsByStudent[assignment.student_id] ||= new Set()).add(cls.subject.trim());
    });
    return cm.students
      .filter((student) => student.status === "active" && student.grade_level && requiredSubjectsByGrade[student.grade_level])
      .map((student) => {
        const enrolled = enrolledSubjectsByStudent[student.id] || new Set();
        const missingSubjects = [...requiredSubjectsByGrade[student.grade_level]].filter((subject) => !enrolled.has(subject));
        return { ...student, missingSubjects };
      })
      .filter((student) => student.missingSubjects.length > 0)
      .sort((a, b) => String(a.grade_level).localeCompare(String(b.grade_level), undefined, { numeric: true }) || a.student_name.localeCompare(b.student_name));
  }, [activeClasses, cm.currentYear?.id, cm.studentAssignments, cm.students, subjectDefs]);

  const grades = useMemo(() => [...new Set(cm.students.map((s) => s.grade_level).filter(Boolean))].sort(), [cm.students]);
  const homerooms = useMemo(() => [...new Set(cm.students.map((s) => s.homeroom).filter(Boolean))].sort(), [cm.students]);

  const handleAssign = async (studentId) => {
    const s = cm.students.find((st) => st.id === studentId);
    await cm.assignStudent(studentId, s?.student_name || "", selectedClassId, selectedClass?.academic_year_id);
  };

  const handleRemove = async (studentId) => {
    const sa = cm.studentAssignments.find((a) => a.student_id === studentId && a.class_id === selectedClassId && a.status === "active");
    if (sa) await cm.removeStudent(sa.id);
  };

  const handleAssignAll = async () => {
    const ids = availableStudents.map((s) => s.id);
    if (ids.length === 0) return;
    await cm.bulkAssignStudents(ids, selectedClassId, selectedClass?.academic_year_id);
  };

  const handleRemoveAll = async () => {
    if (!confirm("Remove all students from this class?")) return;
    await cm.removeAllStudents(selectedClassId);
  };

  const toggle = (setter, id) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleAssignSelected = async () => {
    const ids = availableStudents.filter((s) => selAvail.has(s.id)).map((s) => s.id);
    if (ids.length === 0) return;
    await cm.bulkAssignStudents(ids, selectedClassId, selectedClass?.academic_year_id);
    setSelAvail(new Set());
  };

  const handleRemoveSelected = async () => {
    const targets = cm.studentAssignments.filter((a) => a.class_id === selectedClassId && a.status === "active" && selAssigned.has(a.student_id));
    if (targets.length === 0) return;
    await Promise.all(targets.map((a) => cm.removeStudent(a.id)));
    setSelAssigned(new Set());
  };

  if (cm.loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Assignments</h2>
          <p className="text-sm text-slate-500">Assign students to classes — teachers access students through class membership</p>
        </div>
        <Button onClick={() => setShowImport(true)} variant="outline">
          <Upload className="w-4 h-4 mr-1" /> Import Students
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${coreEnrollmentGaps.length ? "text-amber-500" : "text-emerald-500"}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Core enrollment gaps</h3>
              <p className="text-xs text-slate-400">Students missing one or more core subjects for their grade</p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coreEnrollmentGaps.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{coreEnrollmentGaps.length} student{coreEnrollmentGaps.length === 1 ? "" : "s"}</span>
        </div>
        {coreEnrollmentGaps.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">All active students are enrolled in every available core subject for their grade.</p>
        ) : (
          <div className="max-h-56 divide-y divide-slate-50 overflow-auto">
            {coreEnrollmentGaps.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{student.student_name}</p>
                  <p className="text-xs text-slate-400">Grade {student.grade_level}{student.homeroom ? ` · ${student.homeroom}` : ""}</p>
                </div>
                <p className="text-right text-xs text-amber-700">Missing: {student.missingSubjects.join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Select Class</label>
        <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 w-full md:w-96 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">Choose a class…</option>
          {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.class_name} {c.subject ? `· ${c.subject}` : ""} {c.grade_level ? `· Gr ${c.grade_level}` : ""}</option>)}
        </select>
      </div>

      {selectedClass ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" className="pl-10" />
            </div>
            <select value={fGrade} onChange={(e) => setFGrade(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
              <option value="">All Grades</option>
              {grades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={fHomeroom} onChange={(e) => setFHomeroom(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
              <option value="">All Homerooms</option>
              {homerooms.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4">
            {/* Available Students */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Available Students</h3>
                  <p className="text-xs text-slate-400">{availableStudents.length} available</p>
                </div>
                <Button onClick={handleAssignAll} disabled={availableStudents.length === 0} variant="outline" size="sm">Assign All</Button>
              </div>
              <div className="max-h-96 overflow-auto divide-y divide-slate-50">
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No available students</p>
                ) : (
                  availableStudents.map((s) => {
                    const checked = selAvail.has(s.id);
                    return (
                      <div key={s.id} className={`flex items-center gap-2 px-4 py-2.5 ${checked ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(setSelAvail, s.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{s.student_name}</p>
                          <p className="text-xs text-slate-400">Gr {s.grade_level || "—"} {s.homeroom ? `· ${s.homeroom}` : ""}</p>
                        </div>
                        <button onClick={() => handleAssign(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Assign"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Center controls */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-2">
              <button onClick={handleAssignSelected} disabled={selAvail.size === 0} className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30" title={`Assign selected (${selAvail.size})`}><ChevronRight className="w-5 h-5" /></button>
              <button onClick={handleAssignAll} disabled={availableStudents.length === 0} className="p-2 rounded-lg text-slate-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30" title="Assign all"><ChevronsRight className="w-5 h-5" /></button>
              <button onClick={handleRemoveAll} disabled={assignedStudents.length === 0} className="p-2 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30" title="Remove all"><ChevronsLeft className="w-5 h-5" /></button>
              <button onClick={handleRemoveSelected} disabled={selAssigned.size === 0} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30" title={`Remove selected (${selAssigned.size})`}><ChevronLeft className="w-5 h-5" /></button>
            </div>

            {/* Assigned Students */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned to {selectedClass.class_name}</h3>
                  <p className="text-xs text-slate-400">{assignedStudents.length} enrolled</p>
                </div>
                <Button onClick={handleRemoveAll} disabled={assignedStudents.length === 0} variant="outline" size="sm">Remove All</Button>
              </div>
              <div className="max-h-96 overflow-auto divide-y divide-slate-50">
                {assignedStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No students assigned</p>
                ) : (
                  assignedStudents.map((s) => {
                    const checked = selAssigned.has(s.id);
                    return (
                      <div key={s.id} className={`flex items-center gap-2 px-4 py-2.5 ${checked ? "bg-rose-50/60" : "hover:bg-slate-50"}`}>
                        <button onClick={() => handleRemove(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Remove"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{s.student_name}</p>
                          <p className="text-xs text-slate-400">Gr {s.grade_level || "—"} {s.homeroom ? `· ${s.homeroom}` : ""}</p>
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggle(setSelAssigned, s.id)} className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            <span>{assignedStudents.length} student{assignedStudents.length === 1 ? "" : "s"} enrolled in {selectedClass.class_name}</span>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Select a class to manage student assignments.</p>
        </div>
      )}

      <StudentImportDialog open={showImport} onOpenChange={setShowImport} schoolCode={cm.schoolCode} onImported={cm.loadData} />
    </div>
  );
}