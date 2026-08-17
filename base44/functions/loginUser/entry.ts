import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit, extractRequestInfo, getAdminCredentials, validatePasswordComplexity } from '../../shared/security.ts';
import { buildEmailHtml } from '../../shared/alabamaScenes.ts';
import { waitUntil } from 'base44:runtime';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MFA_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const DORMANT_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

async function sendVerificationEmail(base44, user, subject, htmlBody, auditInfo) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "ReportAL 360 <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to: user.email, subject, html: htmlBody }),
    });
    if (!res.ok) {
      const errText = await res.text();
      await logAudit(base44, "login_failed", auditInfo.username, auditInfo.role, `Email delivery failed (${res.status}): ${errText.slice(0, 200)}`, auditInfo.schoolCode, auditInfo.extra);
      return false;
    }
    return true;
  } catch (e) {
    await logAudit(base44, "login_failed", auditInfo.username, auditInfo.role, `Email delivery error: ${e.message}`, auditInfo.schoolCode, auditInfo.extra);
    return false;
  }
}

export default async function(req) {
  try {
    const body = await req.json();
    const { username, password, mfa_code, dormant_otp, new_password } = body;
    const { ip, userAgent } = extractRequestInfo(req);
    const auditExtra = { ip_address: ip, user_agent: userAgent };

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();

    // Admin login (env-var backed super admin — no MFA)
    if (username === admin.username && password === admin.password) {
      await logAudit(base44, "login_success", username, "admin", "Super admin login", undefined, auditExtra);
      return Response.json({
        success: true,
        user: {
          role: "admin",
          username: admin.username,
          full_name: "Administrator",
          password_reset_required: false,
        },
      });
    }

    // --- Student login (permanent student number; no MFA/OTP) ---
    const students = await base44.asServiceRole.entities.Student.filter({ username }, undefined, 1);
    if (students.length > 0) {
      const student = students[0];
      if (student.status && student.status !== "active") {
        await logAudit(base44, "login_failed", username, "student", "Inactive student account", student.school_code, auditExtra);
        return Response.json({ success: false, error: "This account has been deactivated. Please contact your administrator." });
      }
      if (student.locked_until && new Date(student.locked_until) > new Date()) {
        await logAudit(base44, "login_locked", username, "student", "Login attempt on locked student account", student.school_code, auditExtra);
        return Response.json({ success: false, error: "Account temporarily locked due to repeated failed attempts. Please try again later or contact your administrator." });
      }
      if (student.password !== password) {
        const attempts = (student.failed_login_attempts || 0) + 1;
        const updates: any = { failed_login_attempts: attempts };
        let detail = `Failed attempt ${attempts}`;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
          detail = `Account locked after ${attempts} failed attempts`;
        }
        await base44.asServiceRole.entities.Student.update(student.id, updates);
        await logAudit(base44, attempts >= MAX_FAILED_ATTEMPTS ? "login_locked" : "login_failed", username, "student", detail, student.school_code, auditExtra);
        return Response.json({ success: false, error: "Invalid username or password" });
      }
      if (student.failed_login_attempts > 0 || student.locked_until) {
        await base44.asServiceRole.entities.Student.update(student.id, { failed_login_attempts: 0, locked_until: null });
      }
      // Resolve school/system info for the dashboard
      const schools = await base44.asServiceRole.entities.School.filter({ school_code: student.school_code }, "-year", 1);
      const school = schools[0] || {};
      await base44.asServiceRole.entities.Student.update(student.id, { last_login_at: new Date().toISOString() });
      waitUntil(logAudit(base44, "login_success", username, "student", "Student login successful", student.school_code, auditExtra));
      return Response.json({
        success: true,
        user: {
          id: student.id,
          role: "student",
          username: student.username,
          password: student.password,
          full_name: student.student_name,
          school_code: student.school_code,
          system_code: school.system_code || "",
          school_name: school.school_name || "",
          system_name: school.system_name || "",
          email: student.email || "",
          student_id: student.id,
          grade_level: student.grade_level || "",
          homeroom: student.homeroom || "",
          password_reset_required: student.password_reset_required === true,
        },
      });
    }

    // Parse the 4-digit school code from the username (format: schoolcode.name)
    const dotIndex = username.indexOf(".");
    const parsedSchoolCode = dotIndex > 0 ? username.slice(0, dotIndex) : null;

    // Look up by username; if a school code was parsed, also match on school_code
    const query: any = { username };
    if (parsedSchoolCode) {
      query.school_code = parsedSchoolCode;
    }
    const users = await base44.asServiceRole.entities.Teacher.filter(query);

    if (users.length === 0) {
      await logAudit(base44, "login_failed", username, "", "User not found", parsedSchoolCode || undefined, auditExtra);
      return Response.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = users[0];

    // Check if account is active
    if (user.active === false) {
      await logAudit(base44, "login_failed", username, user.role, "Inactive account login attempt", user.school_code, auditExtra);
      return Response.json({
        success: false,
        error: "This account has been deactivated. Please contact your administrator.",
      });
    }

    // Check if account is locked due to repeated failures
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAudit(base44, "login_locked", username, user.role, "Login attempt on locked account", user.school_code, auditExtra);
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
      const eventType = attempts >= MAX_FAILED_ATTEMPTS ? "login_locked" : "login_failed";
      await logAudit(base44, eventType, username, user.role, detail, user.school_code, auditExtra);
      return Response.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Password correct — reset failed attempt counters
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await base44.asServiceRole.entities.Teacher.update(user.id, {
        failed_login_attempts: 0,
        locked_until: null,
      });
    }

    // --- Dormant account check (locked after 180 days of inactivity) ---
    const lastActivity = user.last_login_at
      ? new Date(user.last_login_at)
      : (user.created_date ? new Date(user.created_date) : null);
    const isDormant = lastActivity ? (Date.now() - lastActivity.getTime()) > DORMANT_THRESHOLD_MS : false;

    if (isDormant) {
      if (dormant_otp && new_password) {
        // Verify the one-time unlock code
        if (!user.mfa_code || user.mfa_code !== dormant_otp) {
          await logAudit(base44, "login_failed", username, user.role, "Invalid dormant unlock code", user.school_code, auditExtra);
          return Response.json({ success: false, error: "Invalid verification code" });
        }
        if (!user.mfa_code_expires_at || new Date(user.mfa_code_expires_at) < new Date()) {
          await logAudit(base44, "login_failed", username, user.role, "Expired dormant unlock code", user.school_code, auditExtra);
          return Response.json({ success: false, error: "Verification code has expired. Please request a new one." });
        }
        // Enforce password complexity and ensure it actually changes
        const complexityError = validatePasswordComplexity(new_password);
        if (complexityError) {
          return Response.json({ success: false, error: complexityError });
        }
        if (new_password === password) {
          return Response.json({ success: false, error: "New password must be different from your current password." });
        }
        // Unlock the account
        await base44.asServiceRole.entities.Teacher.update(user.id, {
          password: new_password,
          mfa_code: null,
          mfa_code_expires_at: null,
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        });
        await logAudit(base44, "password_reset", username, user.role, "Dormant account unlocked via OTP + password change", user.school_code, auditExtra);
        await logAudit(base44, "login_success", username, user.role, "Dormant account unlocked — login successful", user.school_code, auditExtra);
        return Response.json({
          success: true,
          user: {
            id: user.id,
            role: user.role,
            username: user.username,
            full_name: user.full_name,
            school_code: user.school_code,
            system_code: user.system_code,
            school_name: user.school_name,
            system_name: user.system_name,
            email: user.email,
            teacher_id: user.teacher_id,
            coach: user.coach === true,
            password_reset_required: false,
          },
        });
      }

      // Send a one-time unlock code to the user's email
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + MFA_CODE_EXPIRY_MS).toISOString();
      await base44.asServiceRole.entities.Teacher.update(user.id, {
        mfa_code: code,
        mfa_code_expires_at: expiresAt,
      });
      await logAudit(base44, "login_locked", username, user.role, "Dormant account — unlock code sent", user.school_code, auditExtra);

      waitUntil(sendVerificationEmail(base44, user, "Your ReportAL 360 Account Reactivation Code", buildEmailHtml({
        heading: "Account Reactivation Required",
        message: "Your account has been inactive for 180 days and has been locked for security. To reactivate it, use the code below and choose a new password.",
        code,
        footerNote: "This code expires in 10 minutes. If you did not attempt to log in to ReportAL 360, please contact your administrator. Note: your registered email address is case-sensitive — enter it exactly as it appears on your account when using Microsoft or Google sign-in.",
      }), { username, role: user.role, schoolCode: user.school_code, extra: auditExtra }));
      const delivered = true;

      const emailParts = user.email.split("@");
      const emailHint = emailParts.length === 2
        ? emailParts[0].slice(0, 2) + "***@" + emailParts[1]
        : "your email";

      return Response.json({
        success: false,
        dormant_unlock_required: true,
        email_hint: emailHint,
        email_failed: !delivered,
      });
    }

    // --- MFA check ---
    const needsMfa = user.email && user.mfa_enabled !== false && !user.password_reset_required;

    if (needsMfa) {
      if (mfa_code) {
        // Verify the provided code
        if (!user.mfa_code || user.mfa_code !== mfa_code) {
          await logAudit(base44, "login_failed", username, user.role, "Invalid MFA code", user.school_code, auditExtra);
          return Response.json({ success: false, error: "Invalid verification code" });
        }
        if (!user.mfa_code_expires_at || new Date(user.mfa_code_expires_at) < new Date()) {
          await logAudit(base44, "login_failed", username, user.role, "Expired MFA code", user.school_code, auditExtra);
          return Response.json({ success: false, error: "Verification code has expired. Please request a new one." });
        }
        // Code valid — clear it and proceed
        await base44.asServiceRole.entities.Teacher.update(user.id, {
          mfa_code: null,
          mfa_code_expires_at: null,
        });
      } else {
        // Generate a new 6-digit code and email it
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + MFA_CODE_EXPIRY_MS).toISOString();
        await base44.asServiceRole.entities.Teacher.update(user.id, {
          mfa_code: code,
          mfa_code_expires_at: expiresAt,
        });

        waitUntil(sendVerificationEmail(base44, user, "Your ReportAL 360 Verification Code", buildEmailHtml({
          heading: "Your Verification Code",
          message: "Your ReportAL 360 verification code is:",
          code,
          footerNote: "This code expires in 10 minutes. If you did not attempt to log in to ReportAL 360, please contact your administrator. Note: your registered email address is case-sensitive — enter it exactly as it appears on your account when using Microsoft or Google sign-in.",
        }), { username, role: user.role, schoolCode: user.school_code, extra: auditExtra }));
        const delivered = true;

        const emailParts = user.email.split("@");
        const emailHint = emailParts.length === 2
          ? emailParts[0].slice(0, 2) + "***@" + emailParts[1]
          : "your email";

        return Response.json({
          success: false,
          mfa_required: true,
          email_hint: emailHint,
          email_failed: !delivered,
        });
      }
    }

    // Full login successful
    await base44.asServiceRole.entities.Teacher.update(user.id, { last_login_at: new Date().toISOString() });
    waitUntil(logAudit(base44, "login_success", username, user.role, "Login successful", user.school_code, auditExtra));

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
        coach: user.coach === true,
        password_reset_required: user.password_reset_required,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}