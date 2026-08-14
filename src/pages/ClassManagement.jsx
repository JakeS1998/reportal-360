import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useClassManagement } from "@/lib/useClassManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit2, Copy, Archive, Trash2, BookOpen, Users, UserMinus, Wand2, AlertTriangle, CheckCircle2, CalendarCheck } from "lucide-react";
import { buildTeachingSlots } from "@/lib/teachingSlots";
import { buildScheduleSlots, getSchoolDays } from "@/lib/schedulingModels";
import AutoScheduleProgress from "@/components/class/AutoScheduleProgress";
import QuickActionsDialog from "@/components/class/QuickActionsDialog";
import ClassDetailsDialog from "@/components/class/ClassDetailsDialog";
import UnassignedTeacherList from "@/components/class/UnassignedTeacherList";

const STATUS_BADGE = { active: "bg-emerald-50 text-emerald-600", archived: "bg-slate-100 text-slate-500", draft: "bg-amber-50 text-amber-600" };
const ROLE_BADGE = { "Primary Teacher": "bg-blue-50 text-blue-600", "Assistant Teacher": "bg-slate-100 text-slate-600", "Co-Teacher": "bg-indigo-50 text-indigo-600", Substitute: "bg-amber-50 text-amber-600" };

const SCHED_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(":"); return parseInt(h, 10) * 60 + parseInt(m, 10); };
const pad = (n) => String(n).padStart(2, "0");
const mmToHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":"); const hh = parseInt(h, 10); const ampm = hh >= 12 ? "PM" : "AM"; const h12 = hh % 12 || 12; return `${h12}:${m} ${ampm}`; };

// Teaching-slot logic is shared from @/lib/teachingSlots (also used by My Classes for PAT blocks).

const EMPTY_FORM = { class_name: "", subject: "", grade_level: "", period: "", room: "", description: "", academic_year_id: "", status: "active", sessions_per_week: 1, teacher_id: "", schedule_day: "", schedule_start: "", schedule_end: "" };

export default function ClassManagement() {
  const cm = useClassManagement();
  const [search, setSearch] = useState("");
  const [fGrade, setFGrade] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fYear, setFYear] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupClass, setDupClass] = useState(null);
  const [dupYear, setDupYear] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoResult, setAutoResult] = useState(null);
  const [autoProgress, setAutoProgress] = useState({ current: 0, total: 0, label: "" });
  const [assignRunning, setAssignRunning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [assignProgress, setAssignProgress] = useState({ current: 0, total: 0, label: "" });
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [accepting, setAccepting] = useState(false);
  const [subjectDefs, setSubjectDefs] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [scheduleStyle, setScheduleStyle] = useState("traditional");
  const [recurrence, setRecurrence] = useState("weekly");
  const [attendanceTarget, setAttendanceTarget] = useState(null);
  const [clearAssignmentsOpen, setClearAssignmentsOpen] = useState(false);
  const [clearingAssignments, setClearingAssignments] = useState(false);
  const [creatingSections, setCreatingSections] = useState(false);
  const [sectionPlannerOpen, setSectionPlannerOpen] = useState(false);
  const [sectionFrequencies, setSectionFrequencies] = useState({});
  const [classDetail, setClassDetail] = useState(null);
  const [assigningTeacherClassId, setAssigningTeacherClassId] = useState("");

  useEffect(() => {
    base44.entities.Subject.list("name", 200).then(setSubjectDefs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cm.schoolCode) return;
    base44.entities.SchoolTimetable.filter({ school_code: cm.schoolCode }, undefined, 5)
      .then((r) => { const schoolTimetable = r.find((item) => item.scope === "school") || r[0] || null; setTimetable(schoolTimetable); setScheduleStyle(schoolTimetable?.scheduling_model || "traditional"); })
      .catch(() => {});
  }, [cm.schoolCode]);

  const teachingSlots = useMemo(() => buildTeachingSlots(timetable), [timetable]);
  const plannedWeeklyBlocks = useMemo(
    () => subjectDefs.filter((subject) => subject.name && subject.name.toLowerCase() !== "homeroom")
      .reduce((total, subject) => total + (Math.max(1, parseInt(sectionFrequencies[subject.name], 10) || 1)), 0),
    [subjectDefs, sectionFrequencies]
  );
  const weeklyBlocksAvailable = timetable ? teachingSlots.length * SCHED_DAYS.length : 0;

  const roomsForSubject = (subjName) => (subjectDefs.find((s) => s.name === subjName)?.rooms) || [];

  const activeTeachers = cm.teachers.filter((t) => t.role === "teacher" || t.role === "manager");
  const isElementaryGrade = (grade) => cm.school?.school_type === "Elementary" && ["K", "Kindergarten", "0", "1", "2", "3", "4", "5"].includes(String(grade).trim());
  const teacherCanTeach = (teacher, subject, gradeLevel) => {
    const target = (subject || "").trim().toLowerCase();
    const subjects = [...(teacher?.subjects || []), teacher?.subject].filter(Boolean).map((value) => value.trim().toLowerCase());
    const gradeAllowed = !(teacher?.grade_levels?.length) || teacher.grade_levels.includes(String(gradeLevel));
    return gradeAllowed && subjects.some((value) => value === target || value.split(/[,/]/).map((part) => part.trim()).includes(target));
  };
  const canLeadHomeroom = (teacher, gradeLevel) => {
    const subjects = [...(teacher?.subjects || []), teacher?.subject].filter(Boolean).map((value) => value.trim().toLowerCase());
    const gradeAllowed = !(teacher?.grade_levels?.length) || teacher.grade_levels.includes(String(gradeLevel));
    return gradeAllowed && !subjects.some((subject) => ["pe", "music"].includes(subject));
  };
  const workingDaysFor = (teacher) => teacher?.working_days?.length ? teacher.working_days : SCHED_DAYS;
  const teacherWorksOn = (teacher, day) => workingDaysFor(teacher).includes(day);
  const elementaryTeacherGroups = (gradeLevel) => {
    const available = activeTeachers.filter((teacher) => canLeadHomeroom(teacher, gradeLevel));
    const unused = new Map(available.map((teacher) => [teacher.id, teacher]));
    const groups = [];
    available.filter((teacher) => SCHED_DAYS.every((day) => teacherWorksOn(teacher, day))).forEach((teacher) => {
      groups.push([teacher]);
      unused.delete(teacher.id);
    });
    for (const teacher of [...unused.values()]) {
      if (!unused.has(teacher.id)) continue;
      const partner = [...unused.values()].find((candidate) => candidate.id !== teacher.id && SCHED_DAYS.every((day) => teacherWorksOn(teacher, day) || teacherWorksOn(candidate, day)));
      if (!partner) continue;
      groups.push([teacher, partner]);
      unused.delete(teacher.id);
      unused.delete(partner.id);
    }
    return groups;
  };

  const grades = useMemo(() => [...new Set(cm.classes.map((c) => c.grade_level).filter(Boolean))].sort(), [cm.classes]);
  const subjects = useMemo(() => [...new Set(cm.classes.map((c) => c.subject).filter(Boolean))].sort(), [cm.classes]);

  const filtered = useMemo(() => {
    return cm.classes.filter((c) => {
      if (search && !c.class_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (fGrade && c.grade_level !== fGrade) return false;
      if (fSubject && c.subject !== fSubject) return false;
      if (fYear && c.academic_year_id !== fYear) return false;
      return true;
    });
  }, [cm.classes, search, fGrade, fSubject, fYear]);

  const getTeachers = (classId) => cm.teacherAssignments.filter((ta) => ta.class_id === classId);
  const getStudentCount = (classId) => cm.studentAssignments.filter((sa) => sa.class_id === classId && sa.status === "active").length;
  const getYearName = (yearId) => cm.academicYears.find((y) => y.id === yearId)?.name || "—";

  const openClassDetail = async (cls) => {
    setClassDetail({ className: cls.class_name, students: [], schedules: [], loading: true });
    try {
      const response = await base44.functions.invoke("manageStudents", {
        action: "class_details",
        class_id: cls.id,
        school_code: cm.schoolCode,
        caller_username: cm.user?.username,
        caller_password: cm.user?.password || localStorage.getItem("userPassword") || "",
        caller_email: cm.user?.email || "",
        caller_sso: Boolean(cm.user?.sso || cm.user?.email),
      });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to load class details");
      setClassDetail({ className: cls.class_name, students: response.data.students || [], schedules: response.data.schedules || [], loading: false });
    } catch (error) {
      setClassDetail({ className: cls.class_name, students: [], schedules: [], loading: false, error: error.response?.data?.error || error.message || "Unable to load class details" });
    }
  };

  const teacherInitials = (teacherId) => {
    const t = activeTeachers.find((t) => t.id === teacherId);
    if (!t || !t.full_name) return "";
    const parts = t.full_name.trim().split(/\s+/);
    if (parts.length < 2) return (parts[0] || "").slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Auto-generated class name: code (current name) + subject + teacher initials (e.g. "4A English JS")
  const generatedName = [form.class_name, form.subject, teacherInitials(form.teacher_id)]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" ");

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, academic_year_id: cm.currentYear?.id || "" });
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (cls) => {
    setForm({ class_name: cls.class_name || "", subject: cls.subject || "", grade_level: cls.grade_level || "", period: cls.period || "", room: cls.room || "", description: cls.description || "", academic_year_id: cls.academic_year_id || "", status: cls.status || "active", sessions_per_week: cls.sessions_per_week || 1 });
    setEditing(cls);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { teacher_id, schedule_day, schedule_start, schedule_end, ...classData } = form;
    if (!editing) {
      // Default class name to code + subject + teacher initials (e.g. "4A English JS")
      const code = (classData.class_name || "").trim();
      const subj = (classData.subject || "").trim();
      const initials = teacherInitials(teacher_id);
      const generated = [code, subj, initials].filter(Boolean).join(" ");
      if (generated) classData.class_name = generated;
    }
    if (editing) {
      await cm.updateClass(editing.id, classData);
    } else {
      await cm.createClass({ ...classData, teacher_id, schedule_day, schedule_start, schedule_end });
    }
    setShowForm(false);
    setEditing(null);
  };

  const assignQualifiedTeacher = async (item, teacherId) => {
    const teacher = activeTeachers.find((record) => record.id === teacherId);
    if (!teacher || !teacherCanTeach(teacher, item.subject, item.grade_level)) return;
    setAssigningTeacherClassId(item.classId);
    try {
      await base44.entities.TeacherClass.create({ teacher_id: teacher.id, teacher_name: teacher.full_name || "", class_id: item.classId, role: "Primary Teacher", school_code: cm.schoolCode });
      setAutoResult((current) => ({ ...current, failed: current.failed.filter((failure) => failure.classId !== item.classId) }));
      await cm.loadData();
    } finally {
      setAssigningTeacherClassId("");
    }
  };

  const changeScheduleStyle = async (style) => {
    setScheduleStyle(style);
    if (!timetable?.id) return;
    const updated = await base44.entities.SchoolTimetable.update(timetable.id, { scheduling_model: style });
    setTimetable(updated);
  };

  const runAutoSchedule = async () => {
    setAutoRunning(true);
    setAutoResult(null);
    setAutoProgress({ current: 0, total: 0, label: "Preparing…" });
    setSelectedSuggestions(new Set());
    try {
      const ttRes = await base44.entities.SchoolTimetable.filter({ school_code: cm.schoolCode }, undefined, 5);
      const timetable = ttRes[0];
      // Auto Schedule is a full rebuild: stale periods are removed before placing a
      // conflict-free timetable, so prior overlaps cannot survive a new run.
      await base44.entities.ClassSchedule.deleteMany({ school_code: cm.schoolCode, locked: { $ne: true } });
      const existing = await base44.entities.ClassSchedule.filter({ school_code: cm.schoolCode, locked: true }, undefined, 500);

      // Each model generates the same schedule-slot structure. Periods are only
      // one way of creating slots; flexible models provide their own day/times.
      const slots = buildScheduleSlots(timetable);

      const byClass = {};
      existing.forEach((s) => { (byClass[s.class_id] ||= []).push(s); });
      const validTeacherAssignments = {};
      for (const assignment of cm.teacherAssignments) {
        const cls = cm.classes.find((record) => record.id === assignment.class_id);
        const teacher = activeTeachers.find((record) => record.id === assignment.teacher_id);
        const assignmentIsValid = cls && (cls.subject || "").toLowerCase() === "homeroom" && isElementaryGrade(cls.grade_level)
          ? canLeadHomeroom(teacher, cls.grade_level)
          : teacherCanTeach(teacher, cls?.subject, cls?.grade_level);
        if (!assignmentIsValid) {
          await base44.entities.TeacherClass.delete(assignment.id);
          continue;
        }
        validTeacherAssignments[assignment.class_id] ||= assignment;
      }

      // Teacher busy map
      const busy = {};
      existing.forEach((s) => {
        if (!s.teacher_id) return;
        const slotDay = s.day_type || s.day_of_week;
        (busy[s.teacher_id] ||= {})[slotDay] ||= [];
        busy[s.teacher_id][slotDay].push({ start: toMin(s.start_time), end: toMin(s.end_time) });
      });

      const roomBusy = {};
      existing.forEach((schedule) => {
        if (!schedule.room) return;
        const slotDay = schedule.day_type || schedule.day_of_week;
        (roomBusy[schedule.room] ||= {})[slotDay] ||= [];
        roomBusy[schedule.room][slotDay].push({ start: toMin(schedule.start_time), end: toMin(schedule.end_time) });
      });

      // Student rosters per class + student busy map (so a student is never double-booked)
      const classStudents = {};
      cm.studentAssignments.filter((sa) => sa.status === "active").forEach((sa) => {
        (classStudents[sa.class_id] ||= new Set()).add(sa.student_id);
      });
      const studentBusy = {};
      existing.forEach((s) => {
        const studs = classStudents[s.class_id];
        if (!studs) return;
        studs.forEach((sid) => {
          const slotDay = s.day_type || s.day_of_week;
          (studentBusy[sid] ||= {})[slotDay] ||= [];
          studentBusy[sid][slotDay].push({ start: toMin(s.start_time), end: toMin(s.end_time) });
        });
      });

      const overlaps = (list, slot) => list.some((b) => slot.start < b.end && slot.end > b.start);
      const teacherFree = (tid, day, slot) => !overlaps((busy[tid] || {})[day] || [], slot);
      const roomFree = (room, day, slot) => !room || !overlaps((roomBusy[room] || {})[day] || [], slot);
      const studentsFree = (classId, day, slot) => {
        const studs = classStudents[classId];
        if (!studs || studs.size === 0) return true;
        for (const sid of studs) if (overlaps((studentBusy[sid] || {})[day] || [], slot)) return false;
        return true;
      };
      const markStudentsBusy = (classId, day, slot) => {
        const studs = classStudents[classId];
        if (!studs) return;
        studs.forEach((sid) => { (studentBusy[sid] ||= {})[day] ||= []; studentBusy[sid][day].push({ start: slot.start, end: slot.end }); });
      };
      // Prefer a period beside a student's existing period on that day. This packs
      // each student's lessons together instead of scattering them across gaps.
      const studentGapScore = (classId, day, slot) => {
        const studs = classStudents[classId];
        if (!studs?.size) return 0;
        let score = 0;
        studs.forEach((sid) => {
          const blocks = [...((studentBusy[sid] || {})[day] || [])].sort((a, b) => a.start - b.start);
          if (!blocks.length) return;
          if (blocks.some((block) => slot.end === block.start || slot.start === block.end)) { score -= 10; return; }
          const first = blocks[0]; const last = blocks[blocks.length - 1];
          score += slot.end <= first.start ? first.start - slot.end : slot.start - last.end;
        });
        return score;
      };

      const countFree = (tid) => slots.filter((slot) => teacherFree(tid, slot.day_type || slot.day_of_week, slot)).length;

      const scheduled = [];
      const failed = [];
      const assigned = [];
      const suggestions = [];

      const studentName = (sid) =>
        cm.students.find((s) => s.id === sid)?.student_name
        || cm.studentAssignments.find((sa) => sa.student_id === sid)?.student_name
        || sid;
      // Suggest another active class in the exact same grade and subject that the
      // student isn't enrolled in, preferring a schedule without conflicts.
      const suggestAlternative = (cls, sid) => {
        const subj = (cls.subject || "").trim().toLowerCase();
        const grade = (cls.grade_level || "").trim();
        if (!subj || !grade) return null;
        const alts = cm.classes.filter(
          (c) => c.id !== cls.id && c.status === "active" && (c.subject || "").toLowerCase() === subj
            && (c.grade_level || "").trim() === grade && !(classStudents[c.id] || new Set()).has(sid)
        );
        if (alts.length === 0) return null;
        const studentSlots = studentBusy[sid] || {};
        const scored = alts.map((alt) => {
          const altSched = byClass[alt.id] || [];
          const meets = altSched.map((s) => `${s.day_of_week} ${fmtTime(s.start_time)}`).join(", ") || "unscheduled";
          const clashes = altSched.some((s) => overlaps((studentSlots[s.day_of_week] || []), { start: toMin(s.start_time), end: toMin(s.end_time) }));
          return { alt, meets, clashes, count: altSched.length };
        });
        scored.sort((a, b) => (a.clashes - b.clashes) || (b.count - a.count));
        const pick = scored[0];
        return { name: pick.alt.class_name, meets: pick.meets, clashes: pick.clashes, id: pick.alt.id };
      };

      // Schedule the most-constrained classes first (most enrolled students), so
      // shared students get a consistent timetable before less-shared classes fill slots.
      const queue = cm.classes
        .filter((c) => c.status === "active")
        .sort((a, b) => (classStudents[b.id]?.size || 0) - (classStudents[a.id]?.size || 0));

      setAutoProgress({ current: 0, total: queue.length, label: queue.length ? queue[0].class_name : "" });
      for (let qi = 0; qi < queue.length; qi++) {
        const cls = queue[qi];
        const classTimetable = ttRes.find((row) => row.scope === "grade" && row.grade_level === cls.grade_level) || timetable;
        const modelSlots = buildScheduleSlots(classTimetable);
        setAutoProgress({ current: qi, total: queue.length, label: cls.class_name });
        const target = Math.max(1, Math.min(modelSlots.length, parseInt(cls.sessions_per_week, 10) || 1));
        // Homeroom classes are scheduled into the fixed homeroom time block from
        // the school timetable (not the teaching slots, which exclude homeroom).
        const isHomeroom = (cls.subject || "").toLowerCase() === "homeroom";
        const homeroomSlot = classTimetable?.homeroom_start && classTimetable?.homeroom_end
          ? { start: toMin(classTimetable.homeroom_start), end: toMin(classTimetable.homeroom_end) }
          : null;
        if (isHomeroom && !homeroomSlot) { failed.push({ name: cls.class_name, reason: "No homeroom time set in school hours" }); continue; }
        const classSlots = isHomeroom ? getSchoolDays(classTimetable).map((day) => ({ ...homeroomSlot, day_of_week: day, day_type: "", label: "Homeroom" })) : modelSlots;
        const classAssignments = cm.teacherAssignments.filter((assignment) => assignment.class_id === cls.id);
        const qualifiedTeachers = activeTeachers
          .filter((teacher) => isHomeroom && isElementaryGrade(cls.grade_level) ? canLeadHomeroom(teacher, cls.grade_level) : teacherCanTeach(teacher, cls.subject, cls.grade_level))
          .filter((teacher) => !isHomeroom || classAssignments.length === 0 || classAssignments.some((assignment) => assignment.teacher_id === teacher.id))
          .sort((a, b) => {
            const aPrimary = classAssignments.some((assignment) => assignment.teacher_id === a.id && assignment.role === "Primary Teacher") ? 1 : 0;
            const bPrimary = classAssignments.some((assignment) => assignment.teacher_id === b.id && assignment.role === "Primary Teacher") ? 1 : 0;
            return bPrimary - aPrimary || countFree(b.id) - countFree(a.id);
          });
        if (!qualifiedTeachers.length) {
          failed.push({ name: cls.class_name, reason: `No active teacher is qualified for ${cls.subject || "this subject"}.`, classId: cls.id, subject: cls.subject || "", candidates: [] });
          continue;
        }
        const teacherSessions = Object.fromEntries(qualifiedTeachers.map((teacher) => [teacher.id, 0]));
        const roomForTeacher = (teacher) => cls.room || roomsForSubject(cls.subject)[0] || teacher.room || "";
        const have = (byClass[cls.id] || []).length;
        const need = Math.max(0, target - have);
        if (need === 0) continue;
        const usedDays = new Set((byClass[cls.id] || []).map((s) => s.day_type || s.day_of_week));
        const slotDays = [...new Set(classSlots.map((slot) => slot.day_type || slot.day_of_week))];
        const dayLoad = Object.fromEntries(slotDays.map((day) => [day, (byClass[cls.id] || []).filter((session) => (session.day_type || session.day_of_week) === day).length]));
        let placedThis = 0;
        for (let i = 0; i < need; i++) {
          const candidates = [];
          const blockedSlots = [];
          const classStudentsForSchedule = classStudents[cls.id] || new Set();
          for (const slot of classSlots) {
            const day = slot.day_type || slot.day_of_week;
            if (isHomeroom && usedDays.has(day)) continue;
            const availableTeachers = qualifiedTeachers.filter((teacher) => teacherWorksOn(teacher, day) && teacherFree(teacher.id, day, slot) && roomFree(roomForTeacher(teacher), day, slot));
            if (!availableTeachers.length) continue;
            const conflicts = [...classStudentsForSchedule].filter((studentId) => overlaps((studentBusy[studentId] || {})[day] || [], slot));
            if (conflicts.length) {
              blockedSlots.push({ day, ...slot, conflicts });
              continue;
            }
            availableTeachers.sort((a, b) => teacherSessions[b.id] - teacherSessions[a.id]);
            const teacher = availableTeachers[0];
            candidates.push({ day, ...slot, teacher, room: roomForTeacher(teacher), score: studentGapScore(cls.id, day, slot) + dayLoad[day] * 3 });
          }
          candidates.sort((a, b) => a.score - b.score || a.start - b.start || a.day.localeCompare(b.day));
          const placed = candidates[0];
          if (!placed) {
            const blocked = blockedSlots.sort((a, b) => a.conflicts.length - b.conflicts.length)[0];
            if (blocked) blocked.conflicts.forEach((studentId) => suggestions.push({
              student: studentName(studentId), student_id: studentId, fromClass: cls.class_name, from_class_id: cls.id,
              day: blocked.day, time: fmtTime(mmToHHMM(blocked.start)), alt: suggestAlternative(cls, studentId),
            }));
            break;
          }
          const createdSchedule = await base44.entities.ClassSchedule.create({
            class_id: cls.id, class_name: cls.class_name, school_code: cm.schoolCode, academic_year_id: cls.academic_year_id || "",
            schedule_type: classTimetable?.scheduling_model || "traditional", day_type: placed.day_type || "", period_label: placed.label || "",
            teacher_id: placed.teacher.id, teacher_name: placed.teacher.full_name || "", room: placed.room,
            day_of_week: placed.day_of_week, start_time: mmToHHMM(placed.start), end_time: mmToHHMM(placed.end),
            recurrence_type: classTimetable?.scheduling_model === "rotating_block" ? "cycle" : recurrence, recurrence_weeks: recurrence === "biweekly" ? 2 : 1, start_date: new Date().toISOString().slice(0, 10), locked: false,
          });
          (byClass[cls.id] ||= []).push(createdSchedule);
          (busy[placed.teacher.id] ||= {})[placed.day] ||= [];
          busy[placed.teacher.id][placed.day].push({ start: placed.start, end: placed.end });
          if (placed.room) { (roomBusy[placed.room] ||= {})[placed.day] ||= []; roomBusy[placed.room][placed.day].push({ start: placed.start, end: placed.end }); }
          teacherSessions[placed.teacher.id]++;
          markStudentsBusy(cls.id, placed.day, placed);
          usedDays.add(placed.day);
          dayLoad[placed.day]++;
          placedThis++;
          scheduled.push({ name: cls.class_name, day: placed.day, time: fmtTime(mmToHHMM(placed.start)) });
        }
        const scheduledTeachers = qualifiedTeachers.filter((teacher) => teacherSessions[teacher.id] > 0);
        const primaryTeacher = [...scheduledTeachers].sort((a, b) => teacherSessions[b.id] - teacherSessions[a.id])[0];
        for (const teacher of scheduledTeachers) {
          const role = teacher.id === primaryTeacher?.id ? "Primary Teacher" : (isHomeroom ? "Co-Teacher" : "Assistant Teacher");
          const existingAssignment = classAssignments.find((assignment) => assignment.teacher_id === teacher.id);
          if (existingAssignment) await base44.entities.TeacherClass.update(existingAssignment.id, { role });
          else await base44.entities.TeacherClass.create({ teacher_id: teacher.id, teacher_name: teacher.full_name || "", class_id: cls.id, role, school_code: cm.schoolCode });
        }
        if (scheduledTeachers.length) assigned.push({ class: cls.class_name, teacher: scheduledTeachers.map((teacher) => `${teacher.full_name || teacher.username || "Teacher"} (${teacherSessions[teacher.id]})`).join(", ") });
        if (placedThis < need) {
          failed.push({ name: cls.class_name, reason: `Only ${have + placedThis}/${target} sessions fit (teacher/timetable full)` });
        }
      }
      setAutoProgress({ current: queue.length, total: queue.length, label: "Done" });
      setAutoResult({ scheduled: scheduled.length, failed, assigned, suggestions });
      cm.loadData();
    } catch (err) {
      console.error(err);
      setAutoResult({ error: err.message || "Failed to run auto-schedule" });
    } finally {
      setAutoRunning(false);
    }
  };

  const openSectionPlanner = () => {
    const managedSubjects = subjectDefs.filter((subject) => subject.name && subject.name.toLowerCase() !== "homeroom");
    setSectionFrequencies(Object.fromEntries(managedSubjects.map((subject) => [subject.name, 1])));
    setSectionPlannerOpen(true);
  };

  const createClassSections = async () => {
    const activeStudents = cm.students.filter((student) => student.status !== "inactive" && student.grade_level);
    const managedSubjects = subjectDefs.filter((subject) => subject.name && subject.name.toLowerCase() !== "homeroom");
    if (!activeStudents.length || (!managedSubjects.length && !activeStudents.some((student) => isElementaryGrade(student.grade_level)))) return;
    setSectionPlannerOpen(false);
    setCreatingSections(true);
    try {
      const newClasses = [];
      const homeroomTeams = new Map();
      const currentYearId = cm.currentYear?.id || "";
      for (const grade of [...new Set(activeStudents.map((student) => student.grade_level))]) {
        const elementary = isElementaryGrade(grade);
        const elementaryGroups = elementary ? elementaryTeacherGroups(grade) : [];
        const sectionsNeeded = elementary ? elementaryGroups.length : Math.ceil(activeStudents.filter((student) => student.grade_level === grade).length / 30);
        const subjectsToCreate = elementary
          ? [{ name: "Homeroom", sessions: 5 }, { name: "PE", sessions: 1 }, { name: "Music", sessions: 1 }]
          : managedSubjects.map((subject) => ({ name: subject.name, sessions: Math.max(1, parseInt(sectionFrequencies[subject.name], 10) || 1), room: subject.rooms?.[0] || "" }));
        for (const subject of subjectsToCreate) {
          const existing = cm.classes.filter((cls) => cls.status === "active" && cls.grade_level === grade && cls.subject === subject.name && (!currentYearId || cls.academic_year_id === currentYearId));
          for (let section = existing.length + 1; section <= sectionsNeeded; section++) {
            const className = `${grade} ${subject.name} ${section}`;
            newClasses.push({ class_name: className, school_code: cm.schoolCode, school_name: cm.schoolName, academic_year_id: currentYearId, grade_level: grade, subject: subject.name, room: subject.room || roomsForSubject(subject.name)[0] || "", status: "active", sessions_per_week: subject.sessions });
            if (subject.name === "Homeroom") homeroomTeams.set(className, elementaryGroups[section - 1] || []);
          }
        }
      }
      const createdClasses = newClasses.length > 0 ? await base44.entities.Class.bulkCreate(newClasses) : [];
      const teacherAssignments = createdClasses.flatMap((cls) => (homeroomTeams.get(cls.class_name) || []).map((teacher, index) => ({ teacher_id: teacher.id, teacher_name: teacher.full_name || "", class_id: cls.id, role: index === 0 ? "Primary Teacher" : "Co-Teacher", school_code: cm.schoolCode })));
      if (teacherAssignments.length > 0) await base44.entities.TeacherClass.bulkCreate(teacherAssignments);
      await cm.loadData();
      setAssignResult({ sectionsCreated: newClasses.length, created: 0, studentsAssigned: 0, totalStudents: activeStudents.length });
    } finally {
      setCreatingSections(false);
    }
  };

  // Core subjects are assigned to every student and fully rebalanced across
  // available sections. Electives remain available for manual enrollment.
  const autoAssignStudents = async () => {
    if (cm.students.length === 0) { setAssignResult({ error: "No students to assign." }); return; }
    if (!confirm("Rebalance core classes by grade and subject? Existing core enrollments will be replaced so each section stays as even as possible. Elementary classes follow teacher groups first; higher grades remain capped at 30 students.")) return;
    setAssignRunning(true);
    setAssignResult(null);
    setAssignProgress({ current: 0, total: cm.students.length, label: "Starting…" });
    try {
      const electiveSubjects = new Set(subjectDefs.filter((subject) => subject.is_elective).map((subject) => subject.name.trim().toLowerCase()));
      const currentYearId = cm.currentYear?.id || "";
      const elementarySubjects = new Set(["homeroom", "pe", "music"]);
      const activeClasses = cm.classes.filter((cls) => {
        const subject = (cls.subject || "").trim().toLowerCase();
        const included = isElementaryGrade(cls.grade_level) ? elementarySubjects.has(subject) : subject !== "homeroom" && !electiveSubjects.has(subject);
        return cls.status === "active" && cls.grade_level && included && (!currentYearId || cls.academic_year_id === currentYearId);
      });
      const classById = Object.fromEntries(activeClasses.map((cls) => [cls.id, cls]));
      const groups = {};
      activeClasses.forEach((cls) => {
        const key = `${cls.grade_level}|${(cls.subject || "").trim().toLowerCase()}`;
        (groups[key] ||= []).push(cls);
      });
      const existingCoreEnrollments = cm.studentAssignments.filter((assignment) => assignment.status === "active" && classById[assignment.class_id]);
      if (existingCoreEnrollments.length > 0) await base44.entities.StudentClass.bulkUpdate(existingCoreEnrollments.map((assignment) => ({ id: assignment.id, status: "withdrawn" })));
      const toCreate = [];
      const unassigned = new Set();
      const activeStudents = cm.students.filter((student) => student.status !== "inactive" && student.grade_level);
      let processed = 0;
      for (const student of activeStudents) {
        processed++;
        if (processed % 10 === 0) setAssignProgress({ current: processed, total: activeStudents.length, label: student.student_name || "" });
        for (const [key, classList] of Object.entries(groups)) {
          const [grade] = key.split("|");
          if (grade !== student.grade_level) continue;
          const assignedCount = toCreate.filter((assignment) => classList.some((cls) => cls.id === assignment.class_id)).length;
          const target = classList[assignedCount % classList.length];
          if (!isElementaryGrade(grade) && Math.floor(assignedCount / classList.length) >= 30) { unassigned.add(student.id); continue; }
          toCreate.push({ student_id: student.id, student_name: student.student_name, class_id: target.id, academic_year_id: currentYearId, school_code: cm.schoolCode, status: "active" });
        }
      }
      if (toCreate.length > 0) await base44.entities.StudentClass.bulkCreate(toCreate);
      setAssignProgress({ current: activeStudents.length, total: activeStudents.length, label: "Done" });
      setAssignResult({ created: toCreate.length, studentsAssigned: activeStudents.length - unassigned.size, totalStudents: activeStudents.length, unassigned: unassigned.size });
      await cm.loadData();
    } catch (err) {
      console.error(err);
      setAssignResult({ error: err.message || "Failed to auto-assign students" });
    } finally {
      setAssignRunning(false);
    }
  };

  const openAttendance = async (cls) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const dayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const schedules = await base44.entities.ClassSchedule.filter({ class_id: cls.id }, undefined, 200);
    const cycleDay = timetable?.scheduling_model === "rotating_block" ? timetable.cycle_day_types?.[Math.floor((new Date(today.toDateString()) - new Date(`${timetable.cycle_start_date}T00:00:00`)) / 86400000) % timetable.cycle_day_types.length] : "";
    const schedule = schedules.find((item) => cycleDay ? item.day_type === cycleDay : item.day_of_week === dayName);
    setAttendanceTarget({
      classId: cls.id,
      className: cls.class_name,
      scheduleId: schedule?.id || `manual-${cls.id}-${dateStr}`,
      dateStr,
      dayLabel,
    });
  };

  const handleDelete = async (cls) => {
    if (!confirm(`Delete "${cls.class_name}"? This removes all teacher and student assignments.`)) return;
    await cm.deleteClass(cls.id);
  };

  const handleArchive = async (cls) => {
    await cm.updateClass(cls.id, { status: cls.status === "archived" ? "active" : "archived" });
  };

  const handleDuplicate = async () => {
    if (!dupClass || !dupYear) return;
    await cm.duplicateClass(dupClass, dupYear);
    setDupClass(null);
    setDupYear("");
  };

  // Move a conflicted student from the class that clashes into the suggested
  // alternative section of the same subject: withdraw the old enrollment and
  // create an active one in the alternative class.
  const acceptSuggestion = async (sug) => {
    if (!sug.alt?.id) return;
    const existing = cm.studentAssignments.filter(
      (sa) => sa.student_id === sug.student_id && sa.class_id === sug.from_class_id && sa.status === "active"
    );
    for (const sa of existing) await base44.entities.StudentClass.update(sa.id, { status: "withdrawn" });
    const already = cm.studentAssignments.find(
      (sa) => sa.student_id === sug.student_id && sa.class_id === sug.alt.id && sa.status === "active"
    );
    if (!already) {
      await base44.entities.StudentClass.create({
        student_id: sug.student_id, student_name: sug.student, class_id: sug.alt.id,
        academic_year_id: cm.currentYear?.id || "", school_code: cm.schoolCode, status: "active",
      });
    }
  };

  const acceptSuggestions = async (indices) => {
    const list = autoResult?.suggestions || [];
    const targets = indices.map((i) => list[i]).filter((s) => s && s.alt?.id);
    if (targets.length === 0) return;
    setAccepting(true);
    try {
      for (const sug of targets) await acceptSuggestion(sug);
      const done = new Set(indices);
      const remaining = list.filter((_, i) => !done.has(i));
      setAutoResult({ ...autoResult, suggestions: remaining });
      setSelectedSuggestions(new Set());
      cm.loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setAccepting(false);
    }
  };

  const clearTeacherAssignments = async () => {
    setClearingAssignments(true);
    try {
      await Promise.all([
        base44.entities.TeacherClass.deleteMany({ school_code: cm.schoolCode }),
        base44.entities.ClassSchedule.updateMany({ school_code: cm.schoolCode }, { $set: { teacher_id: "", teacher_name: "" } }),
        base44.entities.Class.updateMany({ school_code: cm.schoolCode }, { $set: { teacher_name: "" } }),
      ]);
      setClearAssignmentsOpen(false);
      await cm.loadData();
    } finally {
      setClearingAssignments(false);
    }
  };

  if (cm.loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-xl bg-slate-100 h-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Classes</h2>
          <p className="text-sm text-slate-500">{filtered.length} class{filtered.length === 1 ? "" : "es"} at {cm.schoolName}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button onClick={() => setClearAssignmentsOpen(true)} disabled={cm.teacherAssignments.length === 0} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
            <UserMinus className="w-4 h-4 mr-1" /> Clear Teacher Assignments
          </Button>
          <Button onClick={openSectionPlanner} disabled={creatingSections || cm.students.length === 0 || subjectDefs.length === 0} variant="outline" className="border-slate-200">
            <Plus className="w-4 h-4 mr-1" /> {creatingSections ? "Creating…" : "Create Class Sections"}
          </Button>
          <Button onClick={autoAssignStudents} disabled={assignRunning || cm.students.length === 0} variant="outline" className="border-slate-200">
            <Users className="w-4 h-4 mr-1" /> {assignRunning ? "Assigning…" : "Auto Assign Core Students"}
          </Button>
          <select value={scheduleStyle} onChange={(e) => changeScheduleStyle(e.target.value)} disabled={autoRunning} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2" title="Schedule style">
            <option value="traditional">Traditional</option>
            <option value="rotating_block">A/B Rotating Block</option>
            <option value="flexible_weekly">Flexible Weekly</option>
          </select>
          <Button onClick={runAutoSchedule} disabled={autoRunning || cm.classes.length === 0} variant="outline" className="border-slate-200">
            <Wand2 className="w-4 h-4 mr-1" /> {autoRunning ? "Scheduling…" : "Rebuild Schedule"}
          </Button>
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Create Class
          </Button>
        </div>
      </div>

      {(autoRunning || assignRunning) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {autoRunning && (
            <AutoScheduleProgress icon={Wand2} title="Auto-Scheduling classes" current={autoProgress.current} total={autoProgress.total} label={autoProgress.label} />
          )}
          {assignRunning && (
            <AutoScheduleProgress icon={Users} title="Auto-Assigning students" current={assignProgress.current} total={assignProgress.total} label={assignProgress.label} />
          )}
        </div>
      )}

      {/* Stat Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Total Classes</p>
          <p className="text-2xl font-bold text-slate-900">{cm.classes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{cm.classes.filter((c) => c.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Without Teachers</p>
          <p className="text-2xl font-bold text-amber-600">{cm.classes.filter((c) => !cm.teacherAssignments.find((ta) => ta.class_id === c.id)).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Unassigned Students</p>
          <p className="text-2xl font-bold text-slate-900">{cm.students.filter((s) => !cm.studentAssignments.find((sa) => sa.student_id === s.id && sa.status === "active")).length}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes…" className="pl-10" />
        </div>
        <select value={fGrade} onChange={(e) => setFGrade(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Grades</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Years</option>
          {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No classes found. Create your first class to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls) => {
            const teachers = getTeachers(cls.id);
            const studentCount = getStudentCount(cls.id);
            return (
              <div key={cls.id} onClick={() => openClassDetail(cls)} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col cursor-pointer hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{cls.class_name}</h3>
                    <p className="text-xs text-slate-500">{cls.subject || "—"} · Grade {cls.grade_level || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[cls.status] || ""}`}>{cls.status}</span>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{studentCount} student{studentCount === 1 ? "" : "s"}</span>
                    {cls.room && <><span className="text-slate-300">·</span><span>Room {cls.room}</span></>}
                    <span className="text-slate-300">·</span><span>{getYearName(cls.academic_year_id)}</span>
                    <span className="text-slate-300">·</span><span>{cls.sessions_per_week || 1}×/wk</span>
                  </div>
                  {teachers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teachers.map((t) => (
                        <span key={t.id} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-slate-100"}`}>
                          {t.teacher_name} ({t.role})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-500">No teacher assigned</p>
                  )}
                  {cls.description && <p className="text-xs text-slate-400 line-clamp-2">{cls.description}</p>}
                </div>

                <div onClick={(event) => event.stopPropagation()} className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                  <Button onClick={() => openAttendance(cls)} size="sm" variant="outline" className="mr-1 border-slate-200 text-slate-700">
                    <CalendarCheck className="w-3.5 h-3.5" /> Record attendance
                  </Button>
                  <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setDupClass(cls); setDupYear(cm.currentYear?.id || ""); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleArchive(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title={cls.status === "archived" ? "Unarchive" : "Archive"}><Archive className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 ml-auto" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClassDetailsDialog detail={classDetail} onOpenChange={(open) => !open && setClassDetail(null)} />

      <QuickActionsDialog
        open={!!attendanceTarget}
        onOpenChange={(open) => !open && setAttendanceTarget(null)}
        mode="attendance"
        classId={attendanceTarget?.classId}
        scheduleId={attendanceTarget?.scheduleId}
        className={attendanceTarget?.className}
        dayLabel={attendanceTarget?.dayLabel}
        dateStr={attendanceTarget?.dateStr}
        user={cm.user}
      />

      <Dialog open={sectionPlannerOpen} onOpenChange={setSectionPlannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set weekly class meetings</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Kindergarten through Grade 5 create one homeroom per full-week teacher or teacher pair that covers Monday–Friday, with weekly PE and Music. Higher grades use the subject frequencies below.</p>
          <div className={`rounded-lg border p-3 ${weeklyBlocksAvailable && plannedWeeklyBlocks > weeklyBlocksAvailable ? "border-rose-200 bg-rose-50" : "border-blue-100 bg-blue-50"}`}>
            <p className="text-sm font-semibold text-slate-800">Student weekly blocks: {plannedWeeklyBlocks} of {weeklyBlocksAvailable || "—"}</p>
            <p className={`mt-1 text-xs ${weeklyBlocksAvailable && plannedWeeklyBlocks > weeklyBlocksAvailable ? "text-rose-700" : "text-slate-600"}`}>
              {timetable
                ? plannedWeeklyBlocks > weeklyBlocksAvailable
                  ? `This exceeds your timetable by ${plannedWeeklyBlocks - weeklyBlocksAvailable} block${plannedWeeklyBlocks - weeklyBlocksAvailable === 1 ? "" : "s"}.`
                  : `${weeklyBlocksAvailable - plannedWeeklyBlocks} block${weeklyBlocksAvailable - plannedWeeklyBlocks === 1 ? " remains" : "s remain"} available each week.`
                : "Set up school hours first to see the weekly block limit."}
            </p>
          </div>
          <div className="space-y-3">
            {subjectDefs.filter((subject) => subject.name && subject.name.toLowerCase() !== "homeroom").map((subject) => (
              <div key={subject.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{subject.name}</p>
                  <p className="text-xs text-slate-500">{subject.is_elective ? "Elective" : "Core"}</p>
                </div>
                <Input type="number" min={1} max={5} value={sectionFrequencies[subject.name] || 1} onChange={(e) => setSectionFrequencies({ ...sectionFrequencies, [subject.name]: e.target.value })} className="w-20" aria-label={`${subject.name} meetings per week`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSectionPlannerOpen(false)}>Cancel</Button>
            <Button onClick={createClassSections} disabled={creatingSections} className="bg-slate-900 hover:bg-slate-800">Create Sections</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearAssignmentsOpen} onOpenChange={setClearAssignmentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear teacher assignments?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will remove {cm.teacherAssignments.length} teacher assignment{cm.teacherAssignments.length === 1 ? "" : "s"} from classes and clear the linked teacher details from class schedules. Teachers, classes, and student enrollments will not be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAssignmentsOpen(false)} disabled={clearingAssignments}>Cancel</Button>
            <Button variant="destructive" onClick={clearTeacherAssignments} disabled={clearingAssignments}>
              <UserMinus className="w-4 h-4 mr-1" /> {clearingAssignments ? "Clearing…" : "Clear Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Class" : "Create Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">{editing ? "Class Name" : "Class Code"}</Label>
              <Input required value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder={editing ? "e.g. 4A English JS" : "e.g. 4A"} className="mt-1" />
              {!editing && (form.subject || form.teacher_id) && (
                <p className="text-xs text-slate-500 mt-1">Will be named: <span className="font-medium text-slate-700">{generatedName || form.class_name}</span></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Subject</Label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value, room: "" })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <option value="">Select a subject…</option>
                  {subjectDefs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Grade</Label>
                <Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 5" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Period</Label>
                <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Room</Label>
                <select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} disabled={roomsForSubject(form.subject).length === 0} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 disabled:opacity-50">
                  <option value="">{roomsForSubject(form.subject).length === 0 ? "No rooms for subject" : "Select a room…"}</option>
                  {roomsForSubject(form.subject).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Sessions / week</Label>
                <Input type="number" min={1} value={form.sessions_per_week} onChange={(e) => setForm({ ...form, sessions_per_week: parseInt(e.target.value, 10) || 1 })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Academic Year</Label>
              <select value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">—</option>
                {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" className="mt-1" />
            </div>

            {!editing && (
              <>
                <div className="pt-3 border-t border-slate-100">
                  <Label className="text-sm font-medium text-slate-700">Teacher (optional)</Label>
                  <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <option value="">No teacher yet</option>
                    {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}</option>)}
                  </select>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-600">Weekly schedule (optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Day</Label>
                      <select value={form.schedule_day} onChange={(e) => setForm({ ...form, schedule_day: e.target.value })} className="mt-1 w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                        <option value="">—</option>
                        {SCHED_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Period</Label>
                      <select
                        value={form.schedule_start}
                        onChange={(e) => {
                          const slot = teachingSlots.find((s) => mmToHHMM(s.start) === e.target.value);
                          setForm({ ...form, schedule_start: slot ? mmToHHMM(slot.start) : "", schedule_end: slot ? mmToHHMM(slot.end) : "" });
                        }}
                        disabled={!form.schedule_day}
                        className="mt-1 w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 disabled:opacity-50"
                      >
                        <option value="">{form.schedule_day ? "Select a period…" : "Select a day first"}</option>
                        {teachingSlots.map((s) => <option key={s.start} value={mmToHHMM(s.start)}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Periods come from your school hours (homeroom, break and lunch are excluded), so classes sit back-to-back. Leave the day blank to skip scheduling — you can auto-schedule later.</p>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{editing ? "Save Changes" : "Create Class"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!dupClass} onOpenChange={(v) => !v && setDupClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate "{dupClass?.class_name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select the academic year to copy this class into:</p>
            <select value={dupYear} onChange={(e) => setDupYear(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <option value="">Select year…</option>
              {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupClass(null)}>Cancel</Button>
              <Button onClick={handleDuplicate} disabled={!dupYear} className="bg-slate-900 hover:bg-slate-800">Duplicate</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Schedule Result */}
      <Dialog open={!!autoResult} onOpenChange={(v) => !v && setAutoResult(null)}>
        <DialogContent className="!flex h-[90vh] max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2"><Wand2 className="w-4 h-4" /> Auto-Schedule Result</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {autoResult?.error ? (
              <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{autoResult.error}</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-2xl font-bold text-emerald-600">{autoResult?.scheduled || 0}</p>
                    <p className="text-xs text-slate-500">Sessions scheduled</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-2xl font-bold text-amber-600">{autoResult?.failed?.length || 0}</p>
                    <p className="text-xs text-slate-500">Classes needing attention</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-2xl font-bold text-blue-600">{autoResult?.assigned?.length || 0}</p>
                    <p className="text-xs text-slate-500">Teachers assigned</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">The scheduler has finished processing the current class list.</p>
                {(autoResult?.assigned?.length || 0) > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">Teacher assignments</h4>
                    <div className="space-y-2">
                      {autoResult.assigned.map((item, index) => <div key={`${item.class}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><span className="font-medium text-slate-800">{item.class}</span> — {item.teacher}</div>)}
                    </div>
                  </div>
                )}
                <UnassignedTeacherList
                  items={(autoResult?.failed || []).filter((item) => item.classId)}
                  onAssign={assignQualifiedTeacher}
                  assigningId={assigningTeacherClassId}
                />
                {(autoResult?.failed || []).some((item) => !item.classId) && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">Classes needing attention</h4>
                    <div className="space-y-2">
                      {autoResult.failed.filter((item) => !item.classId).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800"><span className="font-medium">{item.name}:</span> {item.reason}</div>)}
                    </div>
                  </div>
                )}
                {(autoResult?.suggestions?.length || 0) > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">Suggested student moves</h4>
                    <div className="space-y-2">
                      {autoResult.suggestions.map((item, index) => (
                        <label key={`${item.student_id}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                          <Checkbox checked={selectedSuggestions.has(index)} onCheckedChange={(checked) => setSelectedSuggestions((current) => { const next = new Set(current); checked ? next.add(index) : next.delete(index); return next; })} disabled={!item.alt?.id} />
                          <span><span className="font-medium text-slate-800">{item.student}</span>: {item.fromClass} conflicts on {item.day} at {item.time}.{item.alt ? ` Move to ${item.alt.name} (${item.alt.meets}).` : " No alternative section is available."}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" disabled={accepting || !autoResult.suggestions.some((item) => item.alt?.id)} onClick={() => acceptSuggestions(autoResult.suggestions.map((_, index) => index))}>{accepting ? "Moving students…" : "Accept all recommendations"}</Button>
                      <Button variant="outline" disabled={accepting || selectedSuggestions.size === 0} onClick={() => acceptSuggestions([...selectedSuggestions])}>{accepting ? "Moving students…" : `Apply selected moves (${selectedSuggestions.size})`}</Button>
                    </div>
                  </div>
                )}
                {(autoResult?.scheduled || 0) === 0 && (autoResult?.failed?.length || 0) === 0 && (autoResult?.assigned?.length || 0) === 0 && <p className="text-sm text-slate-500">No new sessions were needed because all active classes are already scheduled.</p>}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button onClick={() => setAutoResult(null)} className="bg-slate-900 hover:bg-slate-800">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Students Result */}
      <Dialog open={!!assignResult} onOpenChange={(v) => !v && setAssignResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Auto-Assign Students Result</DialogTitle>
          </DialogHeader>
          {assignResult?.error ? (
            <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{assignResult.error}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-600">{assignResult?.created || 0}</p>
                  <p className="text-xs text-slate-500">New enrollments</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-2xl font-bold text-blue-600">{assignResult?.studentsAssigned || 0}</p>
                  <p className="text-xs text-slate-500">Students updated</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {assignResult?.sectionsCreated !== undefined
                  ? `${assignResult.sectionsCreated} class section${assignResult.sectionsCreated === 1 ? " was" : "s were"} created. Use Auto Assign Core Students to enroll and evenly balance every student in core subjects.`
                  : assignResult?.unassigned
                    ? `${assignResult.unassigned} student${assignResult.unassigned === 1 ? " could" : "s could"} not be assigned because no further section capacity is available. Create more class sections, then run this again.`
                    : `Enrolled ${assignResult?.studentsAssigned || 0} of ${assignResult?.totalStudents || 0} students into one section per core subject for their grade, evenly balancing class sizes.`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAssignResult(null)} className="bg-slate-900 hover:bg-slate-800">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}