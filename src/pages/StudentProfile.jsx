import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSchool } from "@/lib/SchoolContext";
import { generateStudentProgress, generateStudentRoster } from "@/lib/sampleStudentData";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import StudentScheduleDialog from "@/components/student/StudentScheduleDialog";
import StudentPortalPreview from "@/components/student/StudentPortalPreview";
import StudentSensitiveProfile from "@/components/student/StudentSensitiveProfile";
import ParentEmailDialog from "@/components/student/ParentEmailDialog";
import StudentProfileEditDialog from "@/components/student/StudentProfileEditDialog";
import StudentContactDialog from "@/components/student/StudentContactDialog";
import { ArrowLeft, Users, Calendar, GraduationCap, AlertCircle, BookOpen, CalendarDays, Eye, Mail, Pencil, Contact } from "lucide-react";

const STATUS_COLOR = { present: "text-emerald-600", absent: "text-rose-500", late: "text-amber-500", excused: "text-slate-400" };
const INCIDENT_COLOR = { positive: "bg-emerald-50 text-emerald-600", warning: "bg-amber-50 text-amber-600", minor: "bg-orange-50 text-orange-600", major: "bg-rose-50 text-rose-600" };

function buildSampleProfile(student) {
  const progress = generateStudentProgress(student);
  const attainment = progress.scoreTrend.map((subject, index) => ({ id: subject.subject, assessment_name: `${subject.subject} benchmark`, date: `2026-0${index + 1}-15`, score: subject.data[3].score, max_score: 100 }));
  const attendance = progress.attendanceTrend.map((term, index) => ({ id: term.period, date: `2026-0${index + 1}-01`, status: term.rate >= 90 ? "present" : "late" }));
  const [first_name = "", ...last] = student.student_name.split(" ");
  return { student: { ...student, first_name, last_name: last.join(" "), status: "active" }, classes: [], attendance, attainment, behaviour: [], attendanceRate: Math.round(progress.attendanceTrend.reduce((sum, term) => sum + term.rate, 0) / progress.attendanceTrend.length), avgScore: Math.round(attainment.reduce((sum, record) => sum + record.score, 0) / attainment.length) };
}

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeSchool, canManageStaff } = useSchool();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showParentEmail, setShowParentEmail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (studentId.startsWith("sample-")) {
        const studentNumber = studentId.slice("sample-".length);
        const sampleStudent = generateStudentRoster(activeSchool).find((student) => student.student_number === studentNumber);
        setData(sampleStudent ? buildSampleProfile(sampleStudent) : null);
        setLoading(false);
        return;
      }
      try {
        const res = await base44.functions.invoke("manageStudents", {
          action: "get_profile",
          caller_username: user?.username,
          caller_password: user?.password || localStorage.getItem("userPassword") || "",
          caller_email: user?.email || "",
          caller_sso: Boolean(user?.sso || user?.email),
          student_id: studentId,
        });
        if (!res.data?.success) { setLoading(false); return; }
        const { student, classes, attendance, attainment, behaviour } = res.data;
        const present = attendance.filter((a) => a.status === "present").length;
        const attendanceRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;
        const avgScore = attainment.length > 0 ? Math.round(attainment.reduce((s, a) => s + (a.score / (a.max_score || 100)) * 100, 0) / attainment.length) : null;
        setData({ student, classes, attendance, attainment, behaviour, attendanceRate, avgScore });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId, user, activeSchool]);

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;
  if (!data) return <p className="text-sm text-slate-400 text-center py-16">Student not found.</p>;

  const { student: s, classes, attendance, attainment, behaviour, attendanceRate, avgScore } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(location.state?.fromClassId ? `/classes/${location.state.fromClassId}` : "/students")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-slate-500">{(s.student_name || "?").charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{s.student_name}</h2>
            <p className="text-sm text-slate-500">Grade {s.grade_level || "—"} {s.homeroom ? `· ${s.homeroom}` : ""} {s.student_number ? `· #${s.student_number}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageStaff && !studentId.startsWith("sample-") && <Button variant="outline" onClick={() => setShowContacts(true)}><Contact className="w-4 h-4 mr-1" />Contact Info</Button>}
          {canManageStaff && !studentId.startsWith("sample-") && <Button variant="outline" onClick={() => setShowEdit(true)}><Pencil className="w-4 h-4 mr-1" />Edit Profile</Button>}
          {!studentId.startsWith("sample-") && <Button variant="outline" onClick={() => setShowParentEmail(true)}><Mail className="w-4 h-4 mr-1" />Email Parents</Button>}
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-1" /> View As Student
          </Button>
          <Button variant="outline" onClick={() => setShowSchedule(true)}>
            <CalendarDays className="w-4 h-4 mr-1" /> View Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Classes</p></div>
          <p className="text-2xl font-bold text-slate-900">{classes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Attendance</p></div>
          <p className="text-2xl font-bold text-slate-900">{attendanceRate !== null ? `${attendanceRate}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Avg Score</p></div>
          <p className="text-2xl font-bold text-slate-900">{avgScore !== null ? `${avgScore}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Incidents</p></div>
          <p className="text-2xl font-bold text-slate-900">{behaviour.length}</p>
        </div>
      </div>

      <SectionCard title="Demographics">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ["Gender", s.gender],
            ["Race/Ethnicity", s.race_ethnicity],
            ["Lunch Status", s.lunch_status],
            ["Economically Disadvantaged", s.economically_disadvantaged ? "Yes" : "No"],
            ["English Learner", s.english_learner ? "Yes" : "No"],
            ["Disability", s.disability ? "Yes" : "No"],
            ["State Student ID", s.state_student_id],
            ["Status", s.status],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-medium text-slate-700">{value || "—"}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <StudentSensitiveProfile student={s} />

      <SectionCard title="Class Memberships" icon={BookOpen}>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-400">Not enrolled in any classes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link key={c.id} to={`/classes/${c.id}`} className="text-sm bg-slate-50 rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                {c.class_name} <span className="text-slate-400">· {c.subject || "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Attendance History" icon={Calendar}>
          {attendance.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance records.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {attendance.slice(0, 15).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{a.date}</span>
                  <span className={`font-medium ${STATUS_COLOR[a.status] || "text-slate-500"}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Assessment Scores" icon={GraduationCap}>
          {attainment.length === 0 ? (
            <p className="text-sm text-slate-400">No assessment records.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {attainment.slice(0, 15).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-700 truncate">{a.assessment_name}</p>
                    <p className="text-xs text-slate-400">{a.date}</p>
                  </div>
                  <span className="font-medium text-slate-700 shrink-0">{a.score}/{a.max_score || 100}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Behaviour Incidents" icon={AlertCircle}>
        {behaviour.length === 0 ? (
          <p className="text-sm text-slate-400">No behaviour incidents recorded.</p>
        ) : (
          <div className="space-y-2">
            {behaviour.map((b) => (
              <div key={b.id} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${INCIDENT_COLOR[b.incident_type] || "bg-slate-100"}`}>{b.incident_type}</span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{b.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{b.date} {b.action_taken ? `· ${b.action_taken}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <StudentContactDialog open={showContacts} onOpenChange={setShowContacts} student={s} user={user} onSaved={(student) => setData((current) => ({ ...current, student }))} />
      <StudentProfileEditDialog open={showEdit} onOpenChange={setShowEdit} student={s} user={user} onSaved={(student) => setData((current) => ({ ...current, student }))} />
      <ParentEmailDialog open={showParentEmail} onOpenChange={setShowParentEmail} student={s} user={user} />
      <StudentScheduleDialog open={showSchedule} onOpenChange={setShowSchedule} student={s} classes={classes} attendance={attendance} schoolCode={s.school_code} />

      <StudentPortalPreview open={showPreview} onOpenChange={setShowPreview} student={s} classes={classes} attendance={attendance} attainment={attainment} schoolCode={s.school_code} />
    </div>
  );
}