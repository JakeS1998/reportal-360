import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials, logStudentAccess } from '../../shared/security.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

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

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
      callerName = "admin";
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
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    // --- Authorization: may this caller access targetSchoolCode? ---
    const authorizeSchool = async (targetSchoolCode) => {
      if (!targetSchoolCode) return false;
      if (callerRole === "admin") return true;
      if (callerRole === "area") {
        if (!callerSystemCode) return false;
        const dirs = await base44.asServiceRole.entities.SchoolDirectory.filter(
          { school_code: targetSchoolCode }, undefined, 1
        );
        if (dirs.length === 0) return false;
        return dirs[0].system_code === callerSystemCode;
      }
      // manager / teacher — own school only
      return targetSchoolCode === callerSchoolCode;
    };

    // --- LIST ---
    if (action === "list") {
      const { school_code } = params;
      if (!(await authorizeSchool(school_code))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      const students = await base44.asServiceRole.entities.Student.filter(
        { school_code }, "student_name", 500
      );
      return Response.json({ success: true, students });
    }

    // --- GET_PROFILE (student + related FERPA records, all school-scoped) ---
    if (action === "get_profile") {
      const { student_id } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(student.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      const [classAssignments, attendance, attainment, behaviour] = await Promise.all([
        base44.asServiceRole.entities.StudentClass.filter({ student_id, status: "active" }),
        base44.asServiceRole.entities.AttendanceRecord.filter({ student_id }, "-date", 500),
        base44.asServiceRole.entities.AttainmentRecord.filter({ student_id }, "-date", 500),
        base44.asServiceRole.entities.BehaviourRecord.filter({ student_id }, "-date", 100),
      ]);
      const classIds = classAssignments.map((ca) => ca.class_id);
      let classes = [];
      if (classIds.length > 0) {
        const allClasses = await base44.asServiceRole.entities.Class.filter(
          { school_code: student.school_code }, "-created_date", 500
        );
        classes = allClasses.filter((c) => classIds.includes(c.id));
      }
      await logStudentAccess(
        base44, "view_student",
        { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode },
        student_id, req
      );
      return Response.json({ success: true, student, classes, classAssignments, attendance, attainment, behaviour });
    }

    // --- GET ---
    if (action === "get") {
      const { student_id } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(student.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      await logStudentAccess(
        base44, "view_student",
        { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode },
        student_id, req
      );
      return Response.json({ success: true, student });
    }

    // --- CREATE ---
    if (action === "create") {
      const { school_code, ...studentData } = params;
      if (!studentData.student_name || !school_code) {
        return Response.json({ success: false, error: "student_name and school_code required" }, { status: 400 });
      }
      if (!(await authorizeSchool(school_code))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      const created = await base44.asServiceRole.entities.Student.create({
        ...studentData, school_code, status: studentData.status || "active",
      });
      return Response.json({ success: true, student: created });
    }

    // --- BULK_CREATE ---
    if (action === "bulkCreate") {
      const { records } = params;
      if (!Array.isArray(records) || records.length === 0) {
        return Response.json({ success: false, error: "records array required" }, { status: 400 });
      }
      const codes = [...new Set(records.map((r) => r.school_code).filter(Boolean))];
      for (const sc of codes) {
        if (!(await authorizeSchool(sc))) {
          return Response.json({ success: false, error: `Not authorized for school ${sc}` }, { status: 403 });
        }
      }
      const cleaned = records.map((r) => ({ ...r, status: r.status || "active" }));
      const created = await base44.asServiceRole.entities.Student.bulkCreate(cleaned);
      return Response.json({ success: true, count: created.length });
    }

    // --- UPDATE ---
    if (action === "update") {
      const { student_id, data } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      if (!data || typeof data !== "object") {
        return Response.json({ success: false, error: "data object required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Student.get(student_id);
      if (!existing) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(existing.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      if (data.school_code && data.school_code !== existing.school_code) {
        if (!(await authorizeSchool(data.school_code))) {
          return Response.json({ success: false, error: "Not authorized for target school" }, { status: 403 });
        }
      }
      const updated = await base44.asServiceRole.entities.Student.update(student_id, data);
      return Response.json({ success: true, student: updated });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { student_id } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      const existing = await base44.asServiceRole.entities.Student.get(student_id);
      if (!existing) return Response.json({ success: false, error: "Student not found" }, { status: 404 });
      if (!(await authorizeSchool(existing.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      await base44.asServiceRole.entities.Student.delete(student_id);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}