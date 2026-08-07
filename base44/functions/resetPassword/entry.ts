import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validatePasswordComplexity, logAudit } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json();
    const { username, current_password, new_password } = body;

    if (!username || !current_password || !new_password) {
      return Response.json(
        { success: false, error: "Username, current password, and new password are required" },
        { status: 400 }
      );
    }

    // Enforce password complexity (FERPA requirement)
    const complexityError = validatePasswordComplexity(new_password);
    if (complexityError) {
      return Response.json({ success: false, error: complexityError }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // --- Student password reset (username ends with ".student") ---
    if (username.endsWith(".student")) {
      const students = await base44.asServiceRole.entities.Student.filter({
        username: username,
        password: current_password,
      });
      if (students.length === 0) {
        return Response.json({ success: false, error: "Current password is incorrect" });
      }
      const student = students[0];
      await base44.asServiceRole.entities.Student.update(student.id, {
        password: new_password,
        password_reset_required: false,
        failed_login_attempts: 0,
        locked_until: null,
      });
      await logAudit(base44, "password_reset", username, "student", "Student reset their own password", student.school_code);
      return Response.json({ success: true });
    }

    // --- Teacher password reset ---
    const users = await base44.asServiceRole.entities.Teacher.filter({
      username: username,
      password: current_password,
    });

    if (users.length === 0) {
      return Response.json({ success: false, error: "Current password is incorrect" });
    }

    const user = users[0];
    await base44.asServiceRole.entities.Teacher.update(user.id, {
      password: new_password,
      password_reset_required: false,
      failed_login_attempts: 0,
      locked_until: null,
    });

    await logAudit(base44, "password_reset", username, user.role, "User reset their own password", user.school_code);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}