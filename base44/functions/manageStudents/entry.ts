import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { getAdminCredentials, logStudentAccess } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

const DEFAULT_STUDENT_PASSWORD = "Student123!";

function slugifyName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Strip sensitive auth fields before returning a student record to the client.
function sanitizeStudent(s) {
  if (!s) return s;
  const { password, failed_login_attempts, locked_until, ...rest } = s;
  return rest;
}

// Generate a unique login username in the format schoolcode.name.student
async function generateUniqueUsername(base44, schoolCode, name) {
  const slug = slugifyName(name);
  if (!slug) return null;
  const base = `${schoolCode}.${slug}.student`;
  const existing = await base44.asServiceRole.entities.Student.filter(
    { username: base, school_code: schoolCode }, undefined, 1
  );
  if (existing.length === 0) return base;
  // Collision — append a random 4-digit suffix
  return `${schoolCode}.${slug}${Math.floor(1000 + Math.random() * 9000)}.student`;
}

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;
    let callerName = "";
    let callerSchoolName = "";
    let callerId = null;

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
      callerName = "admin";
    } else if (caller_username) {
      // Student auth (username ends with ".student")
      if (caller_username.endsWith(".student")) {
        const students = await base44.asServiceRole.entities.Student.filter({
          username: caller_username,
          password: caller_password,
        });
        if (students.length === 0) {
          return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
        }
        if (students[0].status && students[0].status !== "active") {
          return Response.json({ success: false, error: "Account inactive" }, { status: 403 });
        }
        callerRole = "student";
        callerSchoolCode = students[0].school_code;
        callerName = students[0].username;
        callerId = students[0].id;
      } else {
        const caller = await resolveStaffCaller(base44, {
          callerUsername: caller_username,
          callerPassword: caller_password,
          callerEmail: caller_email,
          callerSso: caller_sso,
        });
        if (!caller) return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
        if (caller.active === false) return Response.json({ success: false, error: "Account inactive" }, { status: 403 });
        callerRole = caller.role;
        callerSystemCode = caller.system_code;
        callerSchoolCode = caller.school_code;
        callerSchoolName = caller.school_name || "";
        callerName = caller.full_name || caller.username;
        callerId = caller.id;
      }
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
      // manager / teacher / student — own school only
      return targetSchoolCode === callerSchoolCode;
    };

    // Students are read-only: block any write action
    const denyStudent = () => Response.json(
      { success: false, error: "Students do not have permission to modify records" },
      { status: 403 }
    );

    // --- LIST ---
    if (action === "list") {
      const { school_code } = params;
      const targetSchool = school_code || callerSchoolCode;
      if (!(await authorizeSchool(targetSchool))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      // Students cannot list the roster
      if (callerRole === "student") {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      // Teachers only see students assigned to them (their classes + homeroom)
      if (callerRole === "teacher") {
        const [tcRes, scRes, hrRes] = await Promise.all([
          base44.asServiceRole.entities.TeacherClass.filter({ school_code: targetSchool }, undefined, 500),
          base44.asServiceRole.entities.StudentClass.filter({ school_code: targetSchool }, undefined, 500),
          base44.asServiceRole.entities.Homeroom.filter({ teacher_id: callerId }, undefined, 50),
        ]);
        const myClassIds = new Set(tcRes.filter((t) => t.teacher_id === callerId).map((t) => t.class_id));
        const scopedStudentIds = new Set();
        scRes.forEach((sc) => { if (myClassIds.has(sc.class_id) && sc.status === "active") scopedStudentIds.add(sc.student_id); });
        hrRes.forEach((h) => (h.student_ids || []).forEach((sid) => scopedStudentIds.add(sid)));
        const allStudents = await base44.asServiceRole.entities.Student.filter(
          { school_code: targetSchool }, "student_name", 500
        );
        const students = allStudents.filter((s) => scopedStudentIds.has(s.id));
        return Response.json({ success: true, students: students.map(sanitizeStudent) });
      }
      // Admin / manager — full roster, auto-backfill missing student logins
      const students = await base44.asServiceRole.entities.Student.filter(
        { school_code: targetSchool }, "student_name", 500
      );
      const existingUsernames = new Set(students.filter((s) => s.username).map((s) => s.username));
      const toBackfill = students.filter((s) => !s.username);
      if (toBackfill.length > 0) {
        const updates = [];
        for (const s of toBackfill) {
          const slug = slugifyName(s.student_name);
          if (!slug) continue;
          let username = `${targetSchool}.${slug}.student`;
          let n = 2;
          while (existingUsernames.has(username)) { username = `${targetSchool}.${slug}${n}.student`; n++; }
          existingUsernames.add(username);
          updates.push({ id: s.id, username, password: DEFAULT_STUDENT_PASSWORD, password_reset_required: true });
        }
        if (updates.length > 0) {
          await base44.asServiceRole.entities.Student.bulkUpdate(updates);
          const map = Object.fromEntries(updates.map((u) => [u.id, u]));
          students.forEach((s) => { if (map[s.id]) { s.username = map[s.id].username; s.password_reset_required = true; } });
        }
      }
      return Response.json({ success: true, students: students.map(sanitizeStudent) });
    }

    if (action === "list_access_audit") {
      if (!["admin", "area", "manager", "school_admin"].includes(callerRole)) return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      const targetSchool = params.school_code || callerSchoolCode;
      if (!(await authorizeSchool(targetSchool))) return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      const logs = await base44.asServiceRole.entities.AuditLog.filter({ school_code: targetSchool, event_type: "view_student" }, "-created_date", 200);
      return Response.json({ success: true, logs });
    }

    if (action === "send_parent_email") {
      if (!["teacher", "manager", "area", "school_admin", "admin"].includes(callerRole)) return Response.json({ success: false, error: "Staff access required" }, { status: 403 });
      const { student_id, recipient_email, subject, message } = params;
      if (!student_id || !recipient_email || !subject || !message) return Response.json({ success: false, error: "Recipient, subject, and message are required" }, { status: 400 });
      if (subject.length > 200 || message.length > 5000 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) return Response.json({ success: false, error: "Please provide a valid email and a shorter message" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student || !(await authorizeSchool(student.school_code))) return Response.json({ success: false, error: "Student unavailable" }, { status: 403 });
      const contactIsListed = (student.emergency_contacts || []).some((contact) => contact.email?.toLowerCase() === recipient_email.toLowerCase());
      if (!contactIsListed) return Response.json({ success: false, error: "Choose an email saved on the student profile" }, { status: 400 });
      if (callerRole === "teacher") {
        const [assignments, enrollment, homerooms] = await Promise.all([base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: callerId }, undefined, 500), base44.asServiceRole.entities.StudentClass.filter({ student_id, status: "active" }, undefined, 500), base44.asServiceRole.entities.Homeroom.filter({ teacher_id: callerId }, undefined, 50)]);
        const classIds = new Set(assignments.map((item) => item.class_id));
        const enrolled = enrollment.some((item) => classIds.has(item.class_id));
        const homeroomTeacher = homerooms.some((item) => (item.student_ids || []).includes(student_id));
        if (!enrolled && !homeroomTeacher) return Response.json({ success: false, error: "Not authorized for this student" }, { status: 403 });
      }
      const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${secrets.get("RESEND_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: `${callerName} at ${callerSchoolName || "ReportAL"} <noreply@reportal.blueridge-group.co.uk>`, to: recipient_email, reply_to: caller_email || undefined, subject, html: `<div style="font-family:Arial,sans-serif;color:#1f2937"><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#6b7280">Sent by ${escapeHtml(callerName)} at ${escapeHtml(callerSchoolName || "ReportAL")} regarding ${escapeHtml(student.student_name)}.</p></div>` }) });
      if (!response.ok) return Response.json({ success: false, error: "Email could not be sent. Confirm the sending domain is verified." }, { status: 502 });
      return Response.json({ success: true });
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
      // Students may only view their own profile
      if (callerRole === "student" && student_id !== callerId) {
        return Response.json({ success: false, error: "Not authorized: you can only view your own profile" }, { status: 403 });
      }

      // Teachers: enforce scope — only students in their classes or homeroom
      if (callerRole === "teacher") {
        const [tcRes, classAssignments, hrRes] = await Promise.all([
          base44.asServiceRole.entities.TeacherClass.filter({ school_code: student.school_code }, undefined, 500),
          base44.asServiceRole.entities.StudentClass.filter({ student_id, status: "active" }),
          base44.asServiceRole.entities.Homeroom.filter({ teacher_id: callerId }, undefined, 50),
        ]);
        const myClassIds = new Set(tcRes.filter((t) => t.teacher_id === callerId).map((t) => t.class_id));
        const studentClassIds = new Set(classAssignments.map((ca) => ca.class_id));
        const sharedClassIds = [...myClassIds].filter((id) => studentClassIds.has(id));
        const isHomeroomTeacher = hrRes.some((h) => (h.student_ids || []).includes(student_id));
        if (sharedClassIds.length === 0 && !isHomeroomTeacher) {
          return Response.json({ success: false, error: "Not authorized: this student is not in your classes or homeroom" }, { status: 403 });
        }
        const [attendance, attainment, behaviour] = await Promise.all([
          base44.asServiceRole.entities.AttendanceRecord.filter({ student_id }, "-date", 500),
          base44.asServiceRole.entities.AttainmentRecord.filter({ student_id }, "-date", 500),
          base44.asServiceRole.entities.BehaviourRecord.filter({ student_id }, "-date", 100),
        ]);
        const allClasses = await base44.asServiceRole.entities.Class.filter({ school_code: student.school_code }, "-created_date", 500);
        let classes = allClasses.filter((c) => studentClassIds.has(c.id));
        await logStudentAccess(base44, "view_student", { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode }, student_id, req);
        if (isHomeroomTeacher) {
          return Response.json({ success: true, student: sanitizeStudent(student), classes, classAssignments, attendance, attainment, behaviour });
        }
        classes = classes.filter((c) => myClassIds.has(c.id));
        return Response.json({
          success: true, student: sanitizeStudent(student), classes, classAssignments,
          attendance: attendance.filter((a) => myClassIds.has(a.class_id)),
          attainment: attainment.filter((a) => myClassIds.has(a.class_id)),
          behaviour: behaviour.filter((b) => myClassIds.has(b.class_id)),
        });
      }

      // Admin / manager / student — full profile (student sees only their own, enforced above)
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
      return Response.json({ success: true, student: sanitizeStudent(student), classes, classAssignments, attendance, attainment, behaviour });
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
      if (callerRole === "student" && student_id !== callerId) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      await logStudentAccess(
        base44, "view_student",
        { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode },
        student_id, req
      );
      return Response.json({ success: true, student: sanitizeStudent(student) });
    }

    // --- CREATE ---
    if (action === "create") {
      if (callerRole === "student") return denyStudent();
      const { school_code, ...studentData } = params;
      if (!studentData.student_name || !school_code) {
        return Response.json({ success: false, error: "student_name and school_code required" }, { status: 400 });
      }
      if (!(await authorizeSchool(school_code))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      // Auto-generate a student login from the roster
      const username = await generateUniqueUsername(base44, school_code, studentData.student_name);
      const created = await base44.asServiceRole.entities.Student.create({
        ...studentData, school_code, status: studentData.status || "active",
        username,
        password: DEFAULT_STUDENT_PASSWORD,
        password_reset_required: true,
      });
      return Response.json({ success: true, student: sanitizeStudent(created) });
    }

    // --- BULK_CREATE ---
    if (action === "bulkCreate") {
      if (callerRole === "student") return denyStudent();
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
      // Auto-generate logins for each new student
      const usedUsernames = new Set();
      const cleaned = [];
      for (const r of records) {
        const username = await generateUniqueUsername(base44, r.school_code, r.student_name);
        if (username && !usedUsernames.has(username)) {
          usedUsernames.add(username);
          cleaned.push({
            ...r, status: r.status || "active",
            username, password: DEFAULT_STUDENT_PASSWORD, password_reset_required: true,
          });
        } else {
          cleaned.push({ ...r, status: r.status || "active" });
        }
      }
      const created = await base44.asServiceRole.entities.Student.bulkCreate(cleaned);
      return Response.json({ success: true, count: created.length });
    }

    // --- UPDATE ---
    if (action === "update") {
      if (callerRole === "student") return denyStudent();
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
      return Response.json({ success: true, student: sanitizeStudent(updated) });
    }

    // --- DELETE ---
    if (action === "delete") {
      if (callerRole === "student") return denyStudent();
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