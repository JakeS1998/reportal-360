import React, { useState, useEffect, useCallback } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import ReportCardEditor from "@/components/report/ReportCardEditor";
import { FileText, Sparkles, Trash2, Eye, GraduationCap } from "lucide-react";

const TERMS = ["Q1", "Q2", "Q3", "Q4", "Semester 1", "Semester 2", "Final"];
const callerCreds = (user) => ({
  caller_username: user?.username,
  caller_password: user?.password || localStorage.getItem("userPassword") || "",
});

const letterGrade = (score) => {
  if (score == null || score === "") return "";
  const n = Number(score);
  if (isNaN(n)) return "";
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "F";
};

export default function ReportBuilder() {
  const { user, school, isTeacher } = useSchool();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classStudents, setClassStudents] = useState([]);
  const [gradeMap, setGradeMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [comments, setComments] = useState({});
  const [term, setTerm] = useState("Q1");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [draft, setDraft] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [savedStatus, setSavedStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState(null);

  // Load the teacher's classes (all classes for admins)
  useEffect(() => {
    const load = async () => {
      if (!user?.username) { setLoadingClasses(false); return; }
      try {
        let myClasses = [];
        if (isTeacher && user.id) {
          const tc = await base44.entities.TeacherClass.filter({ teacher_id: user.id, school_code: user.school_code }, undefined, 500);
          const ids = [...new Set(tc.map((t) => t.class_id))];
          const res = await Promise.all(ids.map((id) => base44.entities.Class.get(id).catch(() => null)));
          myClasses = res.filter(Boolean).filter((c) => c.status === "active");
        } else {
          myClasses = await base44.entities.Class.filter({ school_code: user.school_code, status: "active" }, "-created_date", 500);
        }
        setClasses(myClasses);
      } catch (e) { console.error(e); }
      finally { setLoadingClasses(false); }
    };
    load();
  }, [user?.username, isTeacher]);

  // Load students + auto grade + attendance for the selected class
  useEffect(() => {
    const load = async () => {
      if (!selectedClassId) { setClassStudents([]); setGradeMap({}); setAttendanceMap({}); setComments({}); return; }
      setLoadingClass(true);
      try {
        const [sc, attainment, attendance] = await Promise.all([
          base44.entities.StudentClass.filter({ class_id: selectedClassId, status: "active" }, undefined, 500),
          base44.entities.AttainmentRecord.filter({ class_id: selectedClassId }, "-date", 500).catch(() => []),
          base44.entities.AttendanceRecord.filter({ class_id: selectedClassId }, "-date", 500).catch(() => []),
        ]);
        setClassStudents(sc);
        const g = {};
        attainment.forEach((a) => {
          const pct = (a.score / (a.max_score || 100)) * 100;
          (g[a.student_id] ||= []).push(pct);
        });
        const gMap = {};
        Object.entries(g).forEach(([sid, arr]) => {
          const avg = Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
          gMap[sid] = { score: avg, grade: letterGrade(avg) };
        });
        setGradeMap(gMap);
        const byStudent = {};
        attendance.forEach((a) => {
          (byStudent[a.student_id] ||= { present: 0, total: 0 }).total++;
          if (a.status === "present") byStudent[a.student_id].present++;
        });
        const aMap = {};
        Object.entries(byStudent).forEach(([sid, v]) => {
          aMap[sid] = v.total > 0 ? Math.round((v.present / v.total) * 100) : null;
        });
        setAttendanceMap(aMap);
        setComments({});
      } catch (e) { console.error(e); }
      finally { setLoadingClass(false); }
    };
    load();
  }, [selectedClassId]);

  const loadSavedCards = useCallback(async (sid) => {
    if (!sid) { setSavedCards([]); return; }
    setLoadingCards(true);
    try {
      const res = await base44.functions.invoke("manageReportCards", {
        action: "list", ...callerCreds(user), student_id: sid,
      });
      if (res.data?.success) setSavedCards(res.data.report_cards || []);
    } catch (e) { console.error(e); }
    finally { setLoadingCards(false); }
  }, [user]);

  useEffect(() => {
    setDraft(null); setReportId(null); setSavedStatus(null);
    loadSavedCards(activeStudentId);
  }, [activeStudentId, loadSavedCards]);

  const generate = async (studentId) => {
    if (!studentId || !term) return;
    setGenerating(true);
    setGeneratingFor(studentId);
    setActiveStudentId(studentId);
    setDraft(null); setReportId(null); setSavedStatus(null);
    try {
      const res = await base44.functions.invoke("manageReportCards", {
        action: "generate", ...callerCreds(user), student_id: studentId, term,
        academic_year_id: "",
      });
      if (!res.data?.success) { alert(res.data?.error || "Failed to generate report"); return; }
      // Pre-fill the teacher comment from the class table input
      setDraft({ ...res.data.draft, teacher_comment: comments[studentId] || "" });
    } catch (e) { alert(e.message || "Failed to generate report"); }
    finally { setGenerating(false); setGeneratingFor(null); }
  };

  const persist = async (status) => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke("manageReportCards", {
        action: "save", ...callerCreds(user),
        student_id: draft.student.id,
        term: draft.term,
        academic_year_id: draft.academic_year_id || "",
        grades: draft.grades,
        attendance_rate: draft.attendance_rate,
        teacher_comment: draft.teacher_comment,
        status,
        report_id: reportId || undefined,
      });
      if (!res.data?.success) { alert(res.data?.error || "Failed to save"); return; }
      const card = res.data.report_card;
      setReportId(card.id);
      setSavedStatus(card.status);
      loadSavedCards(draft.student.id);
    } catch (e) { alert(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const openSaved = async (card) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("manageReportCards", {
        action: "get", ...callerCreds(user), report_id: card.id,
      });
      if (!res.data?.success) { alert(res.data?.error || "Failed to load"); return; }
      const c = res.data.report_card;
      setDraft({
        student: { id: c.student_id, student_name: c.student_name },
        term: c.term, academic_year_id: c.academic_year_id,
        grades: c.grades || [], attendance_rate: c.attendance_rate, teacher_comment: c.teacher_comment || "",
      });
      setReportId(c.id);
      setSavedStatus(c.status);
      setTerm(c.term);
      setActiveStudentId(c.student_id);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const removeCard = async (card) => {
    if (!confirm(`Delete ${card.term} report card for ${card.student_name}?`)) return;
    try {
      await base44.functions.invoke("manageReportCards", { action: "delete", ...callerCreds(user), report_id: card.id });
      loadSavedCards(activeStudentId);
    } catch (e) { alert(e.message); }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-slate-500" /> Report Card Builder</h2>
        <p className="text-sm text-slate-500">{isTeacher ? "Build report cards for students in your classes." : `Build report cards for ${school?.school_name || "your school"}.`}</p>
      </div>

      <SectionCard title="1. Select Class & Term" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Class</label>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <option value="">Select a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.class_name}{c.subject ? ` · ${c.subject}` : ""}{c.grade_level ? ` · Grade ${c.grade_level}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Term</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {classes.length === 0 && (
          <p className="text-xs text-slate-400 mt-3">{isTeacher ? "You have no classes assigned yet." : "No classes found."}</p>
        )}
      </SectionCard>

      {selectedClassId && (
        <SectionCard
          title={`2. Students in ${selectedClass?.class_name || ""}`}
          subtitle={loadingClass ? "Loading…" : `${classStudents.length} student${classStudents.length === 1 ? "" : "s"} enrolled`}
          icon={GraduationCap}
        >
          {loadingClass ? <Skeleton className="h-40" /> : classStudents.length === 0 ? (
            <p className="text-xs text-slate-400">No students enrolled in this class.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 px-3 font-medium w-28">Grade</th>
                    <th className="py-2 px-3 font-medium w-28">Attendance</th>
                    <th className="py-2 px-3 font-medium">Comments</th>
                    <th className="py-2 pl-3 font-medium w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classStudents.map((sa) => {
                    const g = gradeMap[sa.student_id];
                    const att = attendanceMap[sa.student_id];
                    const isGen = generating && generatingFor === sa.student_id;
                    return (
                      <tr key={sa.id} className="align-top">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-slate-800">{sa.student_name || "—"}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          {g ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{g.score}%</span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{g.grade}</span>
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {att == null ? <span className="text-slate-300">—</span> : (
                            <span className={att >= 90 ? "text-emerald-600 font-medium" : att >= 75 ? "text-slate-700" : "text-amber-600 font-medium"}>{att}%</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <textarea
                            value={comments[sa.student_id] || ""}
                            onChange={(e) => setComments({ ...comments, [sa.student_id]: e.target.value })}
                            placeholder="Add a comment…"
                            rows={1}
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 resize-y min-h-[36px]"
                          />
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            onClick={() => generate(sa.student_id)}
                            disabled={isGen}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> {isGen ? "…" : "Generate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {draft && (
        <FadeIn>
          <ReportCardEditor
            draft={draft}
            reportId={reportId}
            onChange={setDraft}
            onSave={() => persist("draft")}
            onPublish={() => persist("published")}
            saving={saving}
            savedStatus={savedStatus}
          />
        </FadeIn>
      )}

      {activeStudentId && savedCards.length > 0 && (
        <SectionCard title="Saved Report Cards" subtitle={`${savedCards.length} card${savedCards.length === 1 ? "" : "s"} for this student`} icon={FileText}>
          {loadingCards ? <Skeleton className="h-20" /> : (
            <div className="divide-y divide-slate-100">
              {savedCards.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{c.term} <span className="text-slate-400">· {c.student_name}</span></p>
                    <p className="text-[11px] text-slate-400">{c.grades?.length || 0} subjects · {c.attendance_rate == null ? "—" : `${c.attendance_rate}% attendance`} · {c.published_date ? `Published ${c.published_date}` : "Draft"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                  <button onClick={() => openSaved(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Open"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => removeCard(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}