import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { generateStudentRoster } from "@/lib/sampleStudentData";

export function useClassManagement() {
  const { school, user } = useSchool();
  const schoolCode = school?.school_code;
  const schoolName = school?.school_name;
  const callerCreds = {
    caller_username: user?.username,
    caller_password: user?.password || localStorage.getItem("userPassword") || "",
    caller_email: user?.email || "",
    caller_sso: Boolean(user?.sso || user?.email),
  };

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!schoolCode) return;
    setLoading(true);
    try {
      const [yearsRes, classesRes, tcRes, scRes] = await Promise.all([
        base44.entities.AcademicYear.filter({ school_code: schoolCode }, "-start_date", 100),
        base44.entities.Class.filter({ school_code: schoolCode }, "-created_date", 500),
        base44.entities.TeacherClass.filter({ school_code: schoolCode }, undefined, 500),
        base44.entities.StudentClass.filter({ school_code: schoolCode }, undefined, 5000),
      ]);
      setAcademicYears(yearsRes);
      setClasses(classesRes);
      setTeacherAssignments(tcRes);
      setStudentAssignments(scRes);

      // Students are fetched through the manageStudents function, which enforces
      // server-side school scoping (the RLS equivalent for this custom-auth app).
      const studentsRes = await base44.functions.invoke("manageStudents", {
        action: "list", ...callerCreds, school_code: schoolCode,
      });
      let students = studentsRes.data?.students || [];

      // Seed sample roster into the database if no students exist for this school
      if (students.length === 0 && school) {
        const sampleRoster = generateStudentRoster(school);
        const records = sampleRoster.map((s) => ({
          student_name: s.student_name,
          student_number: s.student_number,
          grade_level: s.grade_level,
          gender: s.gender,
          race_ethnicity: s.race_ethnicity,
          economically_disadvantaged: s.economically_disadvantaged,
          english_learner: s.english_learner,
          disability: s.disability,
          lunch_status: s.lunch_status,
          school_code: schoolCode,
          status: "active",
        }));
        if (records.length > 0) {
          await base44.functions.invoke("manageStudents", { action: "bulkCreate", ...callerCreds, records });
          const reList = await base44.functions.invoke("manageStudents", { action: "list", ...callerCreds, school_code: schoolCode });
          students = reList.data?.students || [];
        }
      }
      setStudents(students);

      const teachersRes = await base44.functions.invoke("manageSchoolStaff", {
        action: "list",
        ...callerCreds,
        school_code: schoolCode,
      });
      if (teachersRes.data?.success) setTeachers([...(teachersRes.data.users || [])].sort((a, b) => (a.full_name || a.username || "").localeCompare(b.full_name || b.username || "")));
    } catch (err) {
      console.error("Failed to load class management data", err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, callerCreds.caller_username, callerCreds.caller_password]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0] || null;

  // --- Class CRUD ---
  const createClass = async (data) => {
    const { teacher_id, schedule_day, schedule_start, schedule_end, ...classData } = data;
    const cls = await base44.entities.Class.create({ ...classData, school_code: schoolCode, school_name: schoolName });
    const teacher = teacher_id ? teachers.find((t) => t.id === teacher_id) : null;
    if (teacher) {
      await base44.entities.TeacherClass.create({ teacher_id, teacher_name: teacher.full_name || "", class_id: cls.id, role: "Primary Teacher", school_code: schoolCode });
    }
    if (schedule_day && schedule_start && schedule_end) {
      await base44.entities.ClassSchedule.create({
        class_id: cls.id, class_name: classData.class_name, school_code: schoolCode,
        teacher_id: teacher_id || "", teacher_name: teacher?.full_name || "", room: classData.room || "",
        day_of_week: schedule_day, start_time: schedule_start, end_time: schedule_end,
        recurrence_type: "weekly", recurrence_weeks: 1, start_date: new Date().toISOString().slice(0, 10),
      });
    }
    loadData();
    return cls;
  };
  const updateClass = async (id, data) => {
    await base44.entities.Class.update(id, data);
    loadData();
  };
  const deleteClass = async (id) => {
    await base44.entities.TeacherClass.deleteMany({ class_id: id });
    await base44.entities.StudentClass.deleteMany({ class_id: id });
    await base44.entities.Class.delete(id);
    loadData();
  };
  const duplicateClass = async (cls, newYearId) => {
    await base44.entities.Class.create({
      class_name: cls.class_name,
      school_code: schoolCode,
      school_name: schoolName,
      academic_year_id: newYearId,
      grade_level: cls.grade_level,
      subject: cls.subject,
      period: cls.period,
      room: cls.room,
      description: cls.description,
      status: "active",
    });
    loadData();
  };

  // --- Academic Year CRUD ---
  const createAcademicYear = async (data) => {
    await base44.entities.AcademicYear.create({ ...data, school_code: schoolCode });
    loadData();
  };
  const updateAcademicYear = async (id, data) => {
    if (data.is_current) {
      const others = academicYears.filter((y) => y.is_current && y.id !== id);
      for (const y of others) await base44.entities.AcademicYear.update(y.id, { is_current: false });
    }
    await base44.entities.AcademicYear.update(id, data);
    loadData();
  };
  const deleteAcademicYear = async (id) => {
    await base44.entities.AcademicYear.delete(id);
    loadData();
  };

  // --- Teacher Assignments ---
  const assignTeacher = async (teacherId, teacherName, classId, role) => {
    const existing = teacherAssignments.find((ta) => ta.teacher_id === teacherId && ta.class_id === classId);
    if (existing) {
      await base44.entities.TeacherClass.update(existing.id, { role });
    } else {
      await base44.entities.TeacherClass.create({ teacher_id: teacherId, teacher_name: teacherName, class_id: classId, role, school_code: schoolCode });
    }
    loadData();
  };
  const removeTeacher = async (assignmentId) => {
    await base44.entities.TeacherClass.delete(assignmentId);
    loadData();
  };

  // --- Student Assignments ---
  const assignStudent = async (studentId, studentName, classId, academicYearId) => {
    const existing = studentAssignments.find((sa) => sa.student_id === studentId && sa.class_id === classId && sa.status === "active");
    if (existing) return;
    await base44.entities.StudentClass.create({ student_id: studentId, student_name: studentName, class_id: classId, academic_year_id: academicYearId || "", school_code: schoolCode, status: "active" });
    loadData();
  };
  const removeStudent = async (assignmentId) => {
    await base44.entities.StudentClass.delete(assignmentId);
    loadData();
  };
  const bulkAssignStudents = async (studentIds, classId, academicYearId) => {
    const records = studentIds
      .filter((sid) => !studentAssignments.find((sa) => sa.student_id === sid && sa.class_id === classId && sa.status === "active"))
      .map((sid) => {
        const s = students.find((st) => st.id === sid);
        return { student_id: sid, student_name: s?.student_name || "", class_id: classId, academic_year_id: academicYearId || "", school_code: schoolCode, status: "active" };
      });
    if (records.length > 0) {
      await base44.entities.StudentClass.bulkCreate(records);
      loadData();
    }
  };
  const removeAllStudents = async (classId) => {
    await base44.entities.StudentClass.deleteMany({ class_id: classId, status: "active" });
    loadData();
  };

  const promoteClasses = async (sourceYearId, targetYearId, copyStudents, copyTeachers) => {
    const sourceClasses = classes.filter((c) => c.academic_year_id === sourceYearId);
    for (const cls of sourceClasses) {
      const newClass = await base44.entities.Class.create({
        class_name: cls.class_name,
        school_code: schoolCode,
        school_name: schoolName,
        academic_year_id: targetYearId,
        grade_level: cls.grade_level,
        subject: cls.subject,
        period: cls.period,
        room: cls.room,
        description: cls.description,
        status: "active",
      });
      if (copyTeachers) {
        const sourceTeachers = teacherAssignments.filter((ta) => ta.class_id === cls.id);
        if (sourceTeachers.length > 0) {
          await base44.entities.TeacherClass.bulkCreate(
            sourceTeachers.map((ta) => ({ teacher_id: ta.teacher_id, teacher_name: ta.teacher_name, class_id: newClass.id, role: ta.role, school_code: schoolCode }))
          );
        }
      }
      if (copyStudents) {
        const sourceStudents = studentAssignments.filter((sa) => sa.class_id === cls.id && sa.status === "active");
        if (sourceStudents.length > 0) {
          await base44.entities.StudentClass.bulkCreate(
            sourceStudents.map((sa) => ({ student_id: sa.student_id, student_name: sa.student_name, class_id: newClass.id, academic_year_id: targetYearId, school_code: schoolCode, status: "active" }))
          );
        }
      }
    }
    loadData();
  };

  return {
    user, school, schoolCode, schoolName, currentYear,
    academicYears, classes, teacherAssignments, studentAssignments, teachers, students,
    loading, loadData,
    createClass, updateClass, deleteClass, duplicateClass,
    createAcademicYear, updateAcademicYear, deleteAcademicYear,
    assignTeacher, removeTeacher,
    assignStudent, removeStudent, bulkAssignStudents, removeAllStudents,
    promoteClasses,
  };
}