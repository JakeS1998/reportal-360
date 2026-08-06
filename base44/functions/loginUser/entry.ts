import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit } from '../../shared/security.ts';

const ADMIN_USERNAME = "BRGAdmin";
const ADMIN_PASSWORD = "BRGAdmin";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export default async function(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Admin login (hardcoded super admin)
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await logAudit(base44, "login_success", username, "admin", "Super admin login");
      return Response.json({
        success: true,
        user: {
          role: "admin",
          username: ADMIN_USERNAME,
          full_name: "Administrator",
          password_reset_required: false,
        },
      });
    }

    // Look up by username only (to support failed-attempt tracking)
    const users = await base44.asServiceRole.entities.Teacher.filter({ username });

    if (users.length === 0) {
      await logAudit(base44, "login_failed", username, "", "User not found");
      return Response.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = users[0];

    // Check if account is active
    if (user.active === false) {
      await logAudit(base44, "login_failed", username, user.role, "Inactive account login attempt", user.school_code);
      return Response.json({
        success: false,
        error: "This account has been deactivated. Please contact your administrator.",
      });
    }

    // Check if account is locked due to repeated failures
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAudit(base44, "login_locked", username, user.role, "Login attempt on locked account", user.school_code);
      return Response.json({
        success: false,
        error: "Account temporarily locked due to repeated failed attempts. Please try again later or contact your administrator.",
      });
    }

    // Verify password
    if (user.password !== password) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: attempts };
      let detail = `Failed attempt ${attempts}`;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        detail = `Account locked after ${attempts} failed attempts`;
      }
      await base44.asServiceRole.entities.Teacher.update(user.id, updates);
      await logAudit(base44, "login_failed", username, user.role, detail, user.school_code);
      return Response.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Successful login — reset failed attempt counters
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await base44.asServiceRole.entities.Teacher.update(user.id, {
        failed_login_attempts: 0,
        locked_until: null,
      });
    }

    await logAudit(base44, "login_success", username, user.role, "Login successful", user.school_code);

    return Response.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        password: user.password,
        full_name: user.full_name,
        school_code: user.school_code,
        system_code: user.system_code,
        school_name: user.school_name,
        system_name: user.system_name,
        email: user.email,
        teacher_id: user.teacher_id,
        password_reset_required: user.password_reset_required,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}