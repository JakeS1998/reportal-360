import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit, extractRequestInfo } from '../../shared/security.ts';

export default async function(req) {
  try {
    const body = await req.json();
    const { action, code, redirect_uri } = body;
    const { ip, userAgent } = extractRequestInfo(req);

    // --- Status check (for admin UI) ---
    if (action === "status") {
      return Response.json({
        success: true,
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      });
    }

    // --- Get authorization URL (frontend calls this to start SSO) ---
    if (action === "authorize_url") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return Response.json({ success: false, error: "Google SSO is not configured. Contact your administrator." }, { status: 500 });
      }
      if (!redirect_uri) {
        return Response.json({ success: false, error: "redirect_uri is required" }, { status: 400 });
      }
      const state = crypto.randomUUID();
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=openid+email+profile&state=${state}&prompt=select_account`;
      return Response.json({ success: true, url, state });
    }

    // --- SSO Login (exchange code for token) ---
    if (!code || !redirect_uri) {
      return Response.json({ success: false, error: "Authorization code and redirect URI are required" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.json({ success: false, error: "Google SSO is not configured. Contact your administrator." }, { status: 500 });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return Response.json({ success: false, error: "Google authentication failed. Please try again." }, { status: 401 });
    }

    const tokens = await tokenResponse.json();

    // Decode ID token to get user info (JWT payload is base64url)
    const idToken = tokens.id_token;
    if (!idToken) {
      return Response.json({ success: false, error: "No ID token received from Google" }, { status: 400 });
    }

    const b64url = idToken.split(".")[1];
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));

    const email = payload.email || "";
    const fullName = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim();

    if (!email) {
      return Response.json({ success: false, error: "No email address found in your Google account" }, { status: 400 });
    }
    if (payload.email_verified === false) {
      return Response.json({ success: false, error: "Your Google email address is not verified" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Look up existing teacher by email
    const teachers = await base44.asServiceRole.entities.Teacher.filter({ email });

    let user;
    if (teachers.length > 0) {
      user = teachers[0];
      if (user.active === false) {
        await logAudit(base44, "login_failed", user.username, user.role, "SSO login attempt on inactive account", user.school_code, { ip_address: ip, user_agent: userAgent });
        return Response.json({ success: false, error: "This account has been deactivated. Please contact your administrator." }, { status: 403 });
      }
      await base44.asServiceRole.entities.Teacher.update(user.id, { last_login_at: new Date().toISOString() });
      await logAudit(base44, "login_success", user.username, user.role, "SSO login successful (Google)", user.school_code, { ip_address: ip, user_agent: userAgent });
    } else {
      // No teacher match — try a student account by email (optional student SSO)
      const students = await base44.asServiceRole.entities.Student.filter({ email });
      if (students.length > 0) {
        const student = students[0];
        if (student.status && student.status !== "active") {
          await logAudit(base44, "login_failed", student.username || email, "student", "SSO login attempt on inactive student account", student.school_code, { ip_address: ip, user_agent: userAgent });
          return Response.json({ success: false, error: "This account has been deactivated. Please contact your administrator." }, { status: 403 });
        }
        const schools = await base44.asServiceRole.entities.School.filter({ school_code: student.school_code }, "-year", 1);
        const school = schools[0] || {};
        await base44.asServiceRole.entities.Student.update(student.id, { last_login_at: new Date().toISOString() });
        await logAudit(base44, "login_success", student.username, "student", "Student SSO login successful (Google)", student.school_code, { ip_address: ip, user_agent: userAgent });
        return Response.json({
          success: true,
          user: {
            id: student.id,
            role: "student",
            username: student.username,
            full_name: student.student_name,
            school_code: student.school_code,
            system_code: school.system_code || "",
            school_name: school.school_name || "",
            system_name: school.system_name || "",
            email: student.email || email,
            student_id: student.id,
            grade_level: student.grade_level || "",
            password_reset_required: false,
            sso: true,
          },
        });
      }
      // SSO registration is disabled — accounts must be created by a school admin first
      await logAudit(base44, "login_failed", email, "unknown", "Google SSO attempt by unregistered user", undefined, { ip_address: ip, user_agent: userAgent });
      return Response.json({ success: false, error: "Your account has not been set up yet. Please contact your school administrator to be added before signing in with Google." }, { status: 403 });
    }

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
        password_reset_required: false,
        sso: true,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}