import React, { useState, useEffect, useCallback } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import ReportCardEditor from "@/components/report/ReportCardEditor";
import { FileText, Sparkles, Trash2, Eye } from "lucide-react";

const TERMS = ["Q1", "Q2", "Q3", "Q4", "Semester 1", "Semester 2", "Final"];
const callerCreds = (user) => ({
  caller_username: user?.username,
  caller_password: user?.password || localStorage.getItem("userPassword") || "",
});

export default function ReportBuilder() {
  const { user, school, isTeacher } = useSchool();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("Q1");
  const [draft, setDraft] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [savedStatus, setSavedStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.username) { setLoadingStudents(false); return; }
      try {
        const res = await base44.functions.invoke("manageStudents", {
          action: "list", ...callerCreds(user), school_code: user.school_code,
        });
        if (res.data?.success) setStudents(res.data.students || []);
      } catch (e) { console.error(e); }
      finally { setLoadingStudents(false); }
    };
    load();
  }, [user?.username]);

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
    loadSavedCards(studentId);
  }, [studentId, loadSavedCards]);

  const generate = async () => {
    if (!studentId || !term) return;
    setGenerating(true);
    setDraft(null); setReportId(null); setSavedStatus(null);
    try {
      const res = await base44.functions.invoke("manageReportCards", {
        action: "generate", ...callerCreds(user), student_id: studentId, term,
        academic_year_id: "",
      });
      if (!res.data?.success) { alert(res.data?.error || "Failed to generate report"); return; }
      setDraft(res.data.draft);
    } catch (e) { alert(e.message || "Failed to generate report"); }
    finally { setGenerating(false); }
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
      const student = students.find((s) => s.id === c.student_id) || { id: c.student_id, student_name: c.student_name, grade_level: "", homeroom: "" };
      setDraft({ student, term: c.term, academic_year_id: c.academic_year_id, grades: c.grades || [], attendance_rate: c.attendance_rate, teacher_comment: c.teacher_comment || "" });
      setReportId(c.id);
      setSavedStatus(c.status);
      setTerm(c.term);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const removeCard = async (card) => {
    if (!confirm(`Delete ${card.term} report card for ${card.student_name}?`)) return;
    try {
      await base44.functions.invoke("manageReportCards", { action: "delete", ...callerCreds(user), report_id: card.id });
      loadSavedCards(studentId);
    } catch (e) { alert(e.message); }
  };

  if (loadingStudents) {
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
        <p className="text-sm text-slate-500">{isTeacher ? "Build report cards for students in your classes or homeroom." : `Build report cards for ${school?.school_name || "your school"}.`}</p>
      </div>

      <SectionCard title="1. Select Student & Term" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500">Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.student_name} {s.grade_level ? `· Grade ${s.grade_level}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Term</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={!studentId || generating} className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" /> {generating ? "Generating…" : "Generate Report Card"}
          </button>
        </div>
        {students.length === 0 && (
          <p className="text-xs text-slate-400 mt-3">{isTeacher ? "No students are assigned to your classes or homeroom yet." : "No students enrolled."}</p>
        )}
      </SectionCard>

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

      {studentId && savedCards.length > 0 && (
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