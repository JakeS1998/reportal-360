import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials, logStudentAccess } from '../../shared/security.ts';
import { getTeacherStudentAccess } from '../../shared/studentScope.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

function letterGrade(score) {
  if (score == null) return "";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, ...params } = body;
    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;
    let callerName = "";
    let callerId = null;
    let callerFullName = "";

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
      callerName = "admin";
      callerFullName = "Administrator";
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({
        username: caller_username,
        password: caller_password,
      });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      if (callers[0].active === false) {
        return Response.json({ success: false, error: "Account inactive" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
      callerName = callers[0].username;
      callerId = callers[0].id;
      callerFullName = callers[0].full_name || callers[0].username;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    const authorizeSchool = async (targetSchoolCode) => {
      if (!targetSchoolCode) return false;
      if (callerRole === "admin") return true;
      if (callerRole === "area") {
        if (!callerSystemCode) return false;
        const dirs = await base44.asServiceRole.entities.SchoolDirectory.filter(
          { school_code: targetSchoolCode }, undefined, 1
        );
        return dirs.length > 0 && dirs[0].system_code === callerSystemCode;
      }
      return targetSchoolCode === callerSchoolCode;
    };

    // --- GENERATE (build a draft report card from attainment + attendance) ---
    if (action === "generate") {
      const { student_id, term, academic_year_id } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(student.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }

      let allowedClassIds = null;
      let isHomeroomTeacher = false;
      if (callerRole === "teacher") {
        const access = await getTeacherStudentAccess(base44, callerId, student.school_code, student_id);
        if (!access) {
          return Response.json({ success: false, error: "Not authorized: this student is not in your classes or homeroom" }, { status: 403 });
        }
        allowedClassIds = access.allowedClassIds;
        isHomeroomTeacher = access.isHomeroomTeacher;
      }

      const [attainment, attendance, classAssignments, allClasses] = await Promise.all([
        base44.asServiceRole.entities.AttainmentRecord.filter({ student_id }, "-date", 500),
        base44.asServiceRole.entities.AttendanceRecord.filter({ student_id }, "-date", 500),
        base44.asServiceRole.entities.StudentClass.filter({ student_id, status: "active" }),
        base44.asServiceRole.entities.Class.filter({ school_code: student.school_code }, "-created_date", 500),
      ]);

      const scopedAttainment = allowedClassIds ? attainment.filter((a) => allowedClassIds.has(a.class_id)) : attainment;
      const scopedAttendance = allowedClassIds ? attendance.filter((a) => allowedClassIds.has(a.class_id)) : attendance;

      // per-class average score
      const byClass = {};
      scopedAttainment.forEach((a) => {
        const key = a.class_id;
        if (!byClass[key]) byClass[key] = [];
        byClass[key].push((a.score / (a.max_score || 100)) * 100);
      });

      const studentClassIds = [...new Set(classAssignments.map((c) => c.class_id))];
      const scopedClassIds = allowedClassIds ? studentClassIds.filter((id) => allowedClassIds.has(id)) : studentClassIds;
      const grades = scopedClassIds.map((cid) => {
        const cls = allClasses.find((c) => c.id === cid);
        const scores = byClass[cid];
        const avg = scores && scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null;
        return {
          class_id: cid,
          class_name: cls?.class_name || "",
          subject: cls?.subject || "",
          score: avg,
          grade: avg == null ? "" : letterGrade(avg),
        };
      });

      const present = scopedAttendance.filter((a) => a.status === "present").length;
      const attendanceRate = scopedAttendance.length > 0 ? Math.round((present / scopedAttendance.length) * 100) : null;

      await logStudentAccess(
        base44, "view_assessment",
        { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode },
        student_id, req
      );

      return Response.json({
        success: true,
        draft: {
          student,
          term: term || "",
          academic_year_id: academic_year_id || "",
          grades,
          attendance_rate: attendanceRate,
          teacher_comment: "",
          is_homeroom_teacher: isHomeroomTeacher,
        },
      });
    }

    // --- SAVE (create or update a report card) ---
    if (action === "save") {
      const { student_id, term, academic_year_id, grades, attendance_rate, teacher_comment, status, report_id } = params;
      if (!student_id || !term) return Response.json({ success: false, error: "student_id and term required" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(student.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      if (callerRole === "teacher") {
        const access = await getTeacherStudentAccess(base44, callerId, student.school_code, student_id);
        if (!access) {
          return Response.json({ success: false, error: "Not authorized: this student is not in your classes or homeroom" }, { status: 403 });
        }
      }
      const finalStatus = status === "published" ? "published" : "draft";
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        student_id,
        student_name: student.student_name,
        school_code: student.school_code,
        academic_year_id: academic_year_id || "",
        term,
        grades: Array.isArray(grades) ? grades : [],
        attendance_rate: attendance_rate == null ? null : Number(attendance_rate),
        teacher_comment: teacher_comment || "",
        teacher_id: callerId || "",
        teacher_name: callerFullName,
        status: finalStatus,
        published_date: finalStatus === "published" ? today : "",
      };
      let report_card;
      if (report_id) {
        report_card = await base44.asServiceRole.entities.ReportCard.update(report_id, payload);
      } else {
        report_card = await base44.asServiceRole.entities.ReportCard.create(payload);
      }
      return Response.json({ success: true, report_card });
    }

    // --- LIST (report cards for a student) ---
    if (action === "list") {
      const { student_id, school_code } = params;
      const target = student_id ? null : (school_code || callerSchoolCode);
      if (student_id) {
        const student = await base44.asServiceRole.entities.Student.get(student_id);
        if (!student) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
        if (!(await authorizeSchool(student.school_code))) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "teacher") {
          const access = await getTeacherStudentAccess(base44, callerId, student.school_code, student_id);
          if (!access) {
            return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
          }
        }
        const cards = await base44.asServiceRole.entities.ReportCard.filter({ student_id }, "-created_date", 100);
        return Response.json({ success: true, report_cards: cards });
      }
      if (!(await authorizeSchool(target))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      const cards = await base44.asServiceRole.entities.ReportCard.filter({ school_code: target }, "-created_date", 500);
      return Response.json({ success: true, report_cards: cards });
    }

    // --- GET ---
    if (action === "get") {
      const { report_id } = params;
      if (!report_id) return Response.json({ success: false, error: "report_id required" }, { status: 400 });
      const card = await base44.asServiceRole.entities.ReportCard.get(report_id);
      if (!card) return Response.json({ success: false, error: "Report card not found" }, { status: 404 });
      if (!(await authorizeSchool(card.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      if (callerRole === "teacher") {
        const access = await getTeacherStudentAccess(base44, callerId, card.school_code, card.student_id);
        if (!access) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
      }
      return Response.json({ success: true, report_card: card });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { report_id } = params;
      if (!report_id) return Response.json({ success: false, error: "report_id required" }, { status: 400 });
      const card = await base44.asServiceRole.entities.ReportCard.get(report_id);
      if (!card) return Response.json({ success: false, error: "Report card not found" }, { status: 404 });
      if (!(await authorizeSchool(card.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      if (callerRole === "teacher") {
        const access = await getTeacherStudentAccess(base44, callerId, card.school_code, card.student_id);
        if (!access) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
      }
      await base44.asServiceRole.entities.ReportCard.delete(report_id);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}