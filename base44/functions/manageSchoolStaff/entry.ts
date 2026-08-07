import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit, validatePasswordComplexity, getAdminCredentials } from '../../shared/security.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

function makeUsername(schoolCode, fullName) {
  const namePart = fullName.toLowerCase()
    .replace(/[^a-z]/g, "")
    .split(" ")
    .join("");
  return `${schoolCode}.${namePart}`;
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

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({
        username: caller_username,
        password: caller_password,
      });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    // --- CREATE ---
    if (action === "create") {
      const { full_name, role, school_code, system_code, school_name, system_name, email, username: customUsername, password: customPassword, subject, room } = params;

      if (!full_name || !role || !school_code || !system_code || !email) {
        return Response.json(
          { success: false, error: "full_name, email, role, school_code, system_code are required" },
          { status: 400 }
        );
      }

      // Permission checks
      if (callerRole === "admin") {
        // admin can create any role anywhere
      } else if (callerRole === "area") {
        if (system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "You can only create users in your system" }, { status: 403 });
        }
        if (role === "area") {
          return Response.json({ success: false, error: "Only admins can create area users" }, { status: 403 });
        }
      } else if (callerRole === "manager") {
        if (system_code !== callerSystemCode || school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "You can only create users in your school" }, { status: 403 });
        }
        if (role !== "teacher") {
          return Response.json({ success: false, error: "Managers can only create teacher accounts" }, { status: 403 });
        }
      } else {
        return Response.json({ success: false, error: "Not authorized to create users" }, { status: 403 });
      }

      const username = (customUsername || "").trim() || makeUsername(school_code, full_name);

      // Check for duplicate username
      const existing = await base44.asServiceRole.entities.Teacher.filter({ username });
      if (existing.length > 0) {
        return Response.json({ success: false, error: "A user with this name already exists at this school" }, { status: 400 });
      }

      const tempPassword = (customPassword || "").trim() || generateRandomPassword();

      // Validate custom password complexity (FERPA requirement)
      if (customPassword && customPassword.trim()) {
        const pwError = validatePasswordComplexity(customPassword.trim());
        if (pwError) return Response.json({ success: false, error: pwError }, { status: 400 });
      }

      const created = await base44.asServiceRole.entities.Teacher.create({
        username,
        password: tempPassword,
        full_name,
        role,
        school_code,
        system_code,
        school_name: school_name || "",
        system_name: system_name || "",
        email: email || "",
        subject: subject || "",
        room: room || "",
        teacher_id: username,
        password_reset_required: true,
      });

      await logAudit(base44, "user_created", caller_username || "", callerRole, `Created user ${username} (${role}) at ${school_code}`, school_code);

      return Response.json({
        success: true,
        user: {
          id: created.id,
          username: created.username,
          full_name: created.full_name,
          role: created.role,
          school_code: created.school_code,
          school_name: created.school_name,
        },
        temp_password: tempPassword,
      });
    }

    // --- LIST ---
    if (action === "list") {
      const { system_code, school_code } = params;
      let filter: any = {};

      if (callerRole === "admin") {
        if (system_code) filter.system_code = system_code;
        if (school_code) filter.school_code = school_code;
      } else if (callerRole === "area") {
        filter.system_code = callerSystemCode;
        if (school_code) filter.school_code = school_code;
      } else if (callerRole === "manager") {
        filter.system_code = callerSystemCode;
        filter.school_code = callerSchoolCode;
      } else {
        return Response.json({ success: false, error: "Not authorized to list users" }, { status: 403 });
      }

      const list = await base44.asServiceRole.entities.Teacher.filter(filter, "-created_date", 500);
      return Response.json({ success: true, users: list });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { user_id } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && !["teacher", "school_admin"].includes(existing.role)) {
          return Response.json({ success: false, error: "Managers can only remove teachers at their school" }, { status: 403 });
        }
      }
      // Clean up related data so the teacher's schedule is cleared and room is released
      const schedules = await base44.asServiceRole.entities.ClassSchedule.filter({ teacher_id: user_id });
      if (schedules.length > 0) {
        await base44.asServiceRole.entities.ClassSchedule.deleteMany({ teacher_id: user_id });
      }
      const teacherClasses = await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: user_id });
      if (teacherClasses.length > 0) {
        const classIds = teacherClasses.map((tc) => tc.class_id);
        await base44.asServiceRole.entities.TeacherClass.deleteMany({ teacher_id: user_id });
        // Release the room and clear the teacher from each affected class
        for (const classId of classIds) {
          try {
            const cls = await base44.asServiceRole.entities.Class.get(classId);
            if (cls && (cls.teacher_name === existing.full_name || cls.teacher_name === existing.username)) {
              await base44.asServiceRole.entities.Class.update(classId, { teacher_name: "", room: "" });
            }
          } catch {}
        }
      }
      await base44.asServiceRole.entities.Teacher.delete(user_id);
      await logAudit(base44, "user_deleted", caller_username || "", callerRole, `Deleted user ${existing.username} at ${existing.school_code} (schedule cleared, room released)`, existing.school_code);
      return Response.json({ success: true });
    }

    // --- RESET PASSWORD (admin/area/manager regenerates a temp password) ---
    if (action === "reset_password") {
      const { user_id } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
      }
      const newPassword = generateRandomPassword();
      await base44.asServiceRole.entities.Teacher.update(user_id, {
        password: newPassword,
        password_reset_required: true,
        failed_login_attempts: 0,
        locked_until: null,
      });
      await logAudit(base44, "password_reset_admin", caller_username || "", callerRole, `Admin reset password for ${existing.username}`, existing.school_code);
      return Response.json({ success: true, temp_password: newPassword });
    }

    // --- UPDATE ---
    if (action === "update") {
      const { user_id, ...updates } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && !["teacher", "school_admin", "manager"].includes(existing.role)) {
          return Response.json({ success: false, error: "Managers can only edit staff at their school" }, { status: 403 });
        }
      }
      if (updates.role !== undefined && updates.role !== existing.role && callerRole !== "admin") {
        return Response.json({ success: false, error: "Only admins can change roles" }, { status: 403 });
      }
      const allowedFields = ["full_name", "email", "subject", "room", "department", "job_title", "active", "role", "mfa_enabled"];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) updateData[field] = updates[field];
      }
      await base44.asServiceRole.entities.Teacher.update(user_id, updateData);
      await logAudit(base44, "user_updated", caller_username || "", callerRole, `Updated user ${existing.username} (${Object.keys(updateData).join(", ")})`, existing.school_code);
      return Response.json({ success: true });
    }

    // --- LIST AUDIT LOGS (admin only) ---
    if (action === "list_audit") {
      if (callerRole !== "admin") {
        return Response.json({ success: false, error: "Admin access required to view audit logs" }, { status: 403 });
      }
      const { limit = 100, event_type, username, school_code, system_code, student_id } = params;
      let filter: any = {};
      if (event_type) filter.event_type = event_type;
      if (username) filter.username = username;
      if (school_code) filter.school_code = school_code;
      if (system_code) filter.system_code = system_code;
      if (student_id) filter.student_id = student_id;
      const logs = await base44.asServiceRole.entities.AuditLog.filter(filter, "-created_date", limit);
      return Response.json({ success: true, logs });
    }

    // --- SECURITY STATS (admin only) ---
    if (action === "security_stats") {
      if (callerRole !== "admin") {
        return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
      }
      const logs = await base44.asServiceRole.entities.AuditLog.filter({}, "-created_date", 500);
      const teachers = await base44.asServiceRole.entities.Teacher.filter({}, "-created_date", 500);
      const now = new Date();
      const loginSuccess = logs.filter((l) => l.event_type === "login_success");
      const loginFailed = logs.filter((l) => l.event_type === "login_failed");
      const lockedAccounts = teachers.filter((t) => t.locked_until && new Date(t.locked_until) > now);
      const failedAttemptAccounts = teachers.filter((t) => (t.failed_login_attempts || 0) > 0);
      const mfaEnabled = teachers.filter((t) => t.mfa_enabled !== false);
      const studentAccessEvents = logs.filter((l) =>
        ["view_student", "search_student", "edit_student", "view_assessment", "view_attendance", "view_discipline"].includes(l.event_type)
      );
      const exportEvents = logs.filter((l) => l.event_type === "data_export");
      return Response.json({
        success: true,
        stats: {
          totalLogins: loginSuccess.length,
          failedLogins: loginFailed.length,
          lockedAccounts: lockedAccounts.length,
          studentAccessEvents: studentAccessEvents.length,
          exportEvents: exportEvents.length,
          totalUsers: teachers.length,
          mfaEnabled: mfaEnabled.length,
          mfaCoverage: teachers.length > 0 ? Math.round((mfaEnabled.length / teachers.length) * 100) : 0,
          failedAttemptAccounts: failedAttemptAccounts.length,
          recentLogs: logs.slice(0, 100),
        },
      });
    }

    // --- LIST POLICIES (admin only) ---
    if (action === "list_policies") {
      if (callerRole !== "admin") {
        return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
      }
      const policies = await base44.asServiceRole.entities.Policy.filter({}, "title", 50);
      return Response.json({ success: true, policies });
    }

    // --- UPDATE POLICY (admin only) ---
    if (action === "update_policy") {
      if (callerRole !== "admin") {
        return Response.json({ success: false, error: "Admin access required" }, { status: 403 });
      }
      const { policy_id, content, title, category } = params;
      if (!policy_id) {
        return Response.json({ success: false, error: "policy_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Policy.get(policy_id);
      if (!existing) {
        return Response.json({ success: false, error: "Policy not found" }, { status: 404 });
      }
      const updateData: any = {
        version: (existing.version || 1) + 1,
        last_updated_by: caller_username || "admin",
      };
      if (content !== undefined) updateData.content = content;
      if (title !== undefined) updateData.title = title;
      if (category !== undefined) updateData.category = category;
      await base44.asServiceRole.entities.Policy.update(policy_id, updateData);
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Updated policy: ${existing.title}`, undefined, { action_type: "policy_updated" });
      return Response.json({ success: true, policy: { ...existing, ...updateData } });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}