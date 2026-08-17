import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { getAdminCredentials, logStudentAccess } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

const DEFAULT_STUDENT_PASSWORD = "Student123!";

function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) password += chars[Math.floor(Math.random() * chars.length)];
  return password;
}

// Strip sensitive auth fields before returning a student record to the client.
function sanitizeStudent(s) {
  if (!s) return s;
  const { password, failed_login_attempts, locked_until, ...rest } = s;
  return rest;
}

// Student numbers are permanent, system-wide login names.
function studentUsername(studentNumber) {
  const normalizedNumber = String(studentNumber || "").trim();
  return normalizedNumber || null;
}

async function usernameIsAvailable(base44, username, excludeStudentId) {
  const matches = await base44.asServiceRole.entities.Student.filter({ username }, undefined, 2);
  return matches.every((student) => student.id === excludeStudentId);
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
      // Student accounts use a permanent student number rather than a school-specific login.
      const students = await base44.asServiceRole.entities.Student.filter({
        username: caller_username,
        password: caller_password,
      }, undefined, 1);
      if (students.length > 0) {
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
      const usernameOwners = new Map(students.filter((student) => student.username).map((student) => [student.username, student.id]));
      const updates = [];
      for (const student of students) {
        const username = studentUsername(student.student_number);
        if (!username || username === student.username) continue;
        const ownerId = usernameOwners.get(username);
        if (ownerId && ownerId !== student.id) continue;
        usernameOwners.set(username, student.id);
        updates.push({ id: student.id, username });
      }
      if (updates.length > 0) {
        await base44.asServiceRole.entities.Student.bulkUpdate(updates);
        const usernames = Object.fromEntries(updates.map((update) => [update.id, update.username]));
        students.forEach((student) => { if (usernames[student.id]) student.username = usernames[student.id]; });
      }
      return Response.json({ success: true, students: students.map(sanitizeStudent) });
    }

    if (action === "list_transfer_destinations") {
      if (!["admin", "area", "manager", "school_admin"].includes(callerRole)) return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      const directories = await base44.asServiceRole.entities.SchoolDirectory.list("school_name", 500);
      const schools = directories.filter((directory) => callerRole === "admin" || directory.system_code === callerSystemCode);
      return Response.json({ success: true, schools: schools.map((directory) => ({ school_code: directory.school_code, school_name: directory.school_name })) });
    }

    if (action === "transfer") {
      if (!["admin", "area", "manager", "school_admin"].includes(callerRole)) return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      const { school_code, target_school_code, student_ids, grade_level } = params;
      const studentIds = [...new Set(student_ids || [])];
      if (!school_code || !target_school_code || !Array.isArray(student_ids) || studentIds.length === 0 || studentIds.length > 500) {
        return Response.json({ success: false, error: "Choose up to 500 students and a destination school" }, { status: 400 });
      }
      if (school_code === target_school_code) return Response.json({ success: false, error: "Choose a different destination school" }, { status: 400 });
      if (!(await authorizeSchool(school_code))) return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      const targetDirectory = await base44.asServiceRole.entities.SchoolDirectory.filter({ school_code: target_school_code }, undefined, 1);
      if (targetDirectory.length === 0 || (callerRole !== "admin" && targetDirectory[0].system_code !== callerSystemCode)) {
        return Response.json({ success: false, error: "Destination school is not available to you" }, { status: 403 });
      }
      const sourceStudents = await base44.asServiceRole.entities.Student.filter({ school_code }, undefined, 500);
      const students = sourceStudents.filter((student) => studentIds.includes(student.id));
      if (students.length !== studentIds.length) return Response.json({ success: false, error: "One or more students are not in this school" }, { status: 400 });
      const transferDate = new Date().toISOString().slice(0, 10);
      const studentUpdates = students.map((student) => ({ id: student.id, school_code: target_school_code, homeroom: "", ...(grade_level ? { grade_level } : {}) }));
      const [enrollments, homerooms] = await Promise.all([
        base44.asServiceRole.entities.StudentClass.filter({ school_code, status: "active" }, undefined, 5000),
        base44.asServiceRole.entities.Homeroom.filter({ school_code }, undefined, 500),
      ]);
      const enrollmentUpdates = enrollments.filter((enrollment) => studentIds.includes(enrollment.student_id)).map((enrollment) => ({ id: enrollment.id, status: "withdrawn", end_date: transferDate }));
      const homeroomUpdates = homerooms.filter((homeroom) => (homeroom.student_ids || []).some((id) => studentIds.includes(id))).map((homeroom) => ({ id: homeroom.id, student_ids: (homeroom.student_ids || []).filter((id) => !studentIds.includes(id)) }));
      await base44.asServiceRole.entities.Student.bulkUpdate(studentUpdates);
      if (enrollmentUpdates.length) await base44.asServiceRole.entities.StudentClass.bulkUpdate(enrollmentUpdates);
      if (homeroomUpdates.length) await base44.asServiceRole.entities.Homeroom.bulkUpdate(homeroomUpdates);
      return Response.json({ success: true, transferred: students.length, destination_school_code: target_school_code });
    }

    if (action === "list_access_audit") {
      if (!["admin", "area", "manager", "school_admin"].includes(callerRole)) return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      const targetSchool = params.school_code || callerSchoolCode;
      if (!(await authorizeSchool(targetSchool))) return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      const [logs, students] = await Promise.all([
        base44.asServiceRole.entities.AuditLog.filter({ school_code: targetSchool, event_type: "view_student" }, "-created_date", 200),
        base44.asServiceRole.entities.Student.filter({ school_code: targetSchool }, "student_name", 500),
      ]);
      const studentNames = new Map(students.map((student) => [student.id, student.student_name]));
      return Response.json({ success: true, logs: logs.map((log) => ({ ...log, student_name: studentNames.get(log.student_id) || "Student record unavailable" })) });
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
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${secrets.get("RESEND_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: `${callerName} at ${callerSchoolName || "ReportAL"} <hello@reportal360.blueridge-group.co.uk>`, to: recipient_email, reply_to: caller_email || undefined, subject, html: `<div style="font-family:Arial,sans-serif;color:#1f2937"><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#6b7280">Sent by ${escapeHtml(callerName)} at ${escapeHtml(callerSchoolName || "ReportAL")} regarding ${escapeHtml(student.student_name)}.</p><p style="font-size:12px;color:#6b7280">Do not reply directly to this email. Please send replies to <a href="mailto:${escapeHtml(caller_email || "")}">${escapeHtml(caller_email || "your teacher")}</a>.</p></div>` }) });
      if (!response.ok) return Response.json({ success: false, error: "Email could not be sent. Confirm the sending domain is verified." }, { status: 502 });
      return Response.json({ success: true });
    }

    // --- CLASS_DETAILS ---
    if (action === "class_details") {
      const { class_id } = params;
      if (!class_id) return Response.json({ success: false, error: "class_id required" }, { status: 400 });
      if (callerRole === "student") return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      const classRecord = await base44.asServiceRole.entities.Class.get(class_id);
      if (!classRecord || !(await authorizeSchool(classRecord.school_code))) {
        return Response.json({ success: false, error: "Class unavailable" }, { status: 403 });
      }
      if (callerRole === "teacher") {
        const assignments = await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: callerId, class_id }, undefined, 1);
        if (assignments.length === 0) return Response.json({ success: false, error: "Not authorized for this class" }, { status: 403 });
      }
      const [enrollments, schedules, students] = await Promise.all([
        base44.asServiceRole.entities.StudentClass.filter({ class_id, status: "active" }, "student_name", 100),
        base44.asServiceRole.entities.ClassSchedule.filter({ class_id }, undefined, 100),
        base44.asServiceRole.entities.Student.filter({ school_code: classRecord.school_code }, "student_name", 500),
      ]);
      const studentNames = new Map(students.map((student) => [student.id, student.student_name]));
      return Response.json({
        success: true,
        students: enrollments.map((enrollment) => ({ id: enrollment.student_id, student_name: studentNames.get(enrollment.student_id) || enrollment.student_name || "Student" })),
        schedules: schedules.map((schedule) => ({ id: schedule.id, day_of_week: schedule.day_of_week, start_time: schedule.start_time, end_time: schedule.end_time, room: schedule.room || "" })),
      });
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
      const schedules = (await Promise.all(
        classIds.map((classId) => base44.asServiceRole.entities.ClassSchedule.filter({ class_id: classId }, undefined, 100))
      )).flat();
      await logStudentAccess(
        base44, "view_student",
        { username: callerName, role: callerRole, school_code: student.school_code, system_code: callerSystemCode },
        student_id, req
      );
      return Response.json({ success: true, student: sanitizeStudent(student), classes, classAssignments, schedules, attendance, attainment, behaviour });
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

    // --- RESET PASSWORD ---
    if (action === "reset_password") {
      if (!["admin", "area", "manager", "school_admin"].includes(callerRole)) return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      const { student_id } = params;
      if (!student_id) return Response.json({ success: false, error: "student_id required" }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student || !(await authorizeSchool(student.school_code))) return Response.json({ success: false, error: "Student unavailable" }, { status: 403 });
      const tempPassword = generateRandomPassword();
      await base44.asServiceRole.entities.Student.update(student_id, { password: tempPassword, password_reset_required: true, failed_login_attempts: 0, locked_until: null });
      return Response.json({ success: true, temp_password: tempPassword });
    }

    // --- CREATE ---
    if (action === "create") {
      if (callerRole === "student") return denyStudent();
      const { school_code, ...studentData } = params;
      if (!studentData.student_name || !studentData.student_number || !school_code) {
        return Response.json({ success: false, error: "student_name, student_number, and school_code required" }, { status: 400 });
      }
      if (!(await authorizeSchool(school_code))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      const username = studentUsername(studentData.student_number);
      if (!(await usernameIsAvailable(base44, username))) {
        return Response.json({ success: false, error: "This student number is already in use" }, { status: 409 });
      }
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
      const usedUsernames = new Set();
      const cleaned = [];
      for (const record of records) {
        const username = studentUsername(record.student_number);
        if (!record.student_name || !username) {
          return Response.json({ success: false, error: "Every student needs a name, student number, and school code" }, { status: 400 });
        }
        if (usedUsernames.has(username) || !(await usernameIsAvailable(base44, username))) {
          return Response.json({ success: false, error: "Duplicate student number" }, { status: 409 });
        }
        usedUsernames.add(username);
        cleaned.push({
          ...record, status: record.status || "active",
          username, password: DEFAULT_STUDENT_PASSWORD, password_reset_required: true,
        });
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
      if (data.student_number !== undefined && data.student_number !== existing.student_number) {
        return Response.json({ success: false, error: "Student number cannot be changed" }, { status: 400 });
      }
      if (data.support_plans !== undefined && JSON.stringify(data.support_plans || []) !== JSON.stringify(existing.support_plans || []) && callerRole !== "manager") {
        return Response.json({ success: false, error: "Only school managers can manage support plans" }, { status: 403 });
      }
      const { student_number, username, password, ...updates } = data;
      const updated = await base44.asServiceRole.entities.Student.update(student_id, updates);
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