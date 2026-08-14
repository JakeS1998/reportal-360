import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validatePasswordComplexity, logAudit } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json();
    const { username, current_password, new_password } = body;
    if (!username || !new_password) return Response.json({ success: false, error: "Username and new password are required" }, { status: 400 });
    const complexityError = validatePasswordComplexity(new_password);
    if (complexityError) return Response.json({ success: false, error: complexityError }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const students = await base44.asServiceRole.entities.Student.filter({ username }, undefined, 1);
    const teachers = students.length ? [] : await base44.asServiceRole.entities.Teacher.filter({ username }, undefined, 1);
    const account = students[0] || teachers[0];
    const type = students.length ? "student" : "teacher";
    if (!account) return Response.json({ success: false, error: "Account not found" }, { status: 404 });

    const isFirstLoginReset = account.password_reset_required === true;
    if (!isFirstLoginReset && account.password !== current_password) {
      return Response.json({ success: false, error: "Current password is incorrect" }, { status: 403 });
    }

    const entity = students.length ? base44.asServiceRole.entities.Student : base44.asServiceRole.entities.Teacher;
    await entity.update(account.id, {
      password: new_password,
      password_reset_required: false,
      failed_login_attempts: 0,
      locked_until: null,
    });
    await logAudit(base44, "password_reset", username, account.role || type, isFirstLoginReset ? "User set first-login password" : "User reset their password", account.school_code);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}