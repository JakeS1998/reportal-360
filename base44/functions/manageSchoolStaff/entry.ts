import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit, validatePasswordComplexity, getAdminCredentials, extractRequestInfo } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';
import { buildEmailHtml } from '../../shared/alabamaScenes.ts';
import { secrets } from 'base44:runtime';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();
const authorizationWords = ["amber", "apple", "beacon", "birch", "bridge", "candle", "cedar", "cloud", "coral", "copper", "dawn", "ember", "fern", "garden", "harbor", "indigo", "juniper", "meadow", "maple", "moss", "north", "orchard", "paper", "pebble", "pine", "river", "robin", "sable", "silver", "sunrise", "thistle", "velvet", "willow"];

function generateAuthorizationCode() {
  return Array.from({ length: 3 }, () => authorizationWords[Math.floor(Math.random() * authorizationWords.length)]).join(" ");
}

async function hashAuthorizationCode(code: string) {
  const bytes = new TextEncoder().encode(code.trim().toLowerCase().replace(/\s+/g, " "));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

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

function resolveWorkingDays(workingDays = []) {
  const allowed = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const selected = Array.isArray(workingDays) ? workingDays.filter(Boolean) : [];
  if (selected.some((day) => !allowed.includes(day))) return { error: "Working days must be Monday through Friday" };
  return { workingDays: selected.length ? selected : allowed };
}

function resolveGradeLevels(teachingLevel, gradeLevels = [], role = "teacher") {
  if (["area", "commissioner"].includes(role)) return { gradeLevels: [] };
  const allowedByLevel = {
    elementary: ["Pre-K", "K", "1", "2", "3", "4", "5"],
    middle: ["6", "7", "8"],
    high: ["8", "9", "10", "11", "12"],
  };
  const allowed = allowedByLevel[teachingLevel];
  if (!allowed) return { error: "School level must be elementary, middle, or high" };
  const selected = Array.isArray(gradeLevels) ? gradeLevels : [];
  if (role === "manager" && selected.length === 0) return { gradeLevels: [] };
  if (teachingLevel === "elementary" && selected.length === 0) return { error: "Elementary staff must have at least one grade assigned" };
  if (selected.some((grade) => !allowed.includes(grade))) return { error: `${teachingLevel === "middle" ? "Middle" : teachingLevel === "high" ? "High" : "Elementary"} staff can only be assigned eligible grades` };
  return { gradeLevels: selected.length > 0 ? selected : allowed };
}

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;

    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let caller = null;
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
    } else {
      caller = await resolveStaffCaller(base44, {
        callerUsername: caller_username,
        callerPassword: caller_password,
        callerEmail: caller_email,
        callerSso: caller_sso,
      });
      if (!caller) return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      callerRole = caller.role;
      callerSystemCode = caller.system_code;
      callerSchoolCode = caller.school_code;
    }

    if (action === "create_school_directory") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("school_discovery"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const school_name = String(params.school_name || "").trim();
      const system_code = String(params.system_code || "").trim();
      const school_code = String(params.school_code || "").trim();
      if (!school_name || !system_code || !school_code) return Response.json({ success: false, error: "School name, system code, and school code are required" }, { status: 400 });
      const school_key = `${system_code}-${school_code}`;
      const existing = await base44.asServiceRole.entities.SchoolDirectory.filter({ school_key }, undefined, 1);
      if (existing.length) return Response.json({ success: false, error: "A school with this system and school code already exists" }, { status: 409 });
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.SchoolDirectory.create({ school_key, system_code, school_code, school_name, active: true, status: "new", date_discovered: now, last_verified: now, last_updated: now });
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Created school directory entry ${school_name} (${school_key})`, school_code);
      return Response.json({ success: true, school_key });
    }

    if (action === "list_school_access_audit" || action === "list_admin_activity") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("audit_access"))) return Response.json({ success: false, error: "Audit permission required" }, { status: 403 });
      const filter = action === "list_school_access_audit" ? { action_type: "admin_school_access" } : { username: params.username };
      const activity = await base44.asServiceRole.entities.AuditLog.filter(filter, "-created_date", 5000);
      return Response.json({ success: true, activity });
    }

    // --- ADMIN SCHOOL ACCESS ---
    if (action === "list_school_access_options") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("school_access"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const schools = await base44.asServiceRole.entities.SchoolDirectory.list("school_name", 5000);
      return Response.json({ success: true, schools: schools.filter((school) => school.active !== false && school.status !== "closed").map((school) => ({ id: school.id, school_key: school.school_key, school_code: school.school_code, system_code: school.system_code, school_name: school.school_name })) });
    }

    if (action === "list_school_access_authorizers") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("school_access"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const directory = (await base44.asServiceRole.entities.SchoolDirectory.filter({ school_key: params.school_key }, undefined, 1))[0];
      if (!directory) return Response.json({ success: false, error: "School not found" }, { status: 404 });
      const staff = await base44.asServiceRole.entities.Teacher.filter({ school_code: directory.school_code }, "full_name", 5000);
      return Response.json({ success: true, staff: staff.filter((member) => member.system_code === directory.system_code && member.active !== false && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email || "")).map((member) => ({ id: member.id, full_name: member.full_name, email: member.email })) });
    }

    if (action === "request_school_access_authorization") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("school_access"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const { school_key, reason, authorizer_id } = params;
      if (!school_key || typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 1000 || !authorizer_id) return Response.json({ success: false, error: "Select a staff member and provide an access reason between 10 and 1,000 characters" }, { status: 400 });
      const school = (await base44.asServiceRole.entities.SchoolDirectory.filter({ school_key }, undefined, 1))[0];
      const authorizer = await base44.asServiceRole.entities.Teacher.get(authorizer_id);
      if (!school || school.active === false || school.status === "closed" || !authorizer || authorizer.school_code !== school.school_code || authorizer.active === false || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorizer.email || "")) return Response.json({ success: false, error: "Choose an active staff member with a valid school email address" }, { status: 400 });
      const authorizationCode = generateAuthorizationCode();
      const challenge_id = crypto.randomUUID();
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.SchoolAccessAuthorization.create({ challenge_id, requester_username: caller_username || caller?.username || "", school_code: school.school_code, system_code: school.system_code, school_name: school.school_name, reason: reason.trim(), authorizer_id: authorizer.id, authorizer_name: authorizer.full_name, authorizer_email: authorizer.email, otp_hash: await hashAuthorizationCode(authorizationCode), expires_at, status: "pending" });
      const emailResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || "ReportAL 360 <onboarding@resend.dev>", to: authorizer.email, subject: "Your ReportAL 360 School Access Authorization Code", html: buildEmailHtml({ heading: "School Access Authorization", message: `An administrator has requested access to ${school.school_name}. Share this authorization code only if you approve the request.\n\nAccess reason: ${reason.trim()}`, code: authorizationCode, footerNote: "This authorization code expires in 10 minutes. Do not share it unless you approve this school access request." }) }) });
      if (!emailResponse.ok) return Response.json({ success: false, error: "Unable to email the authorization code" }, { status: 500 });
      return Response.json({ success: true, challenge_id });
    }

    if (action === "verify_school_access_authorization") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("school_access"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const authorization = (await base44.asServiceRole.entities.SchoolAccessAuthorization.filter({ challenge_id: params.challenge_id }, undefined, 1))[0];
      if (!authorization || authorization.requester_username !== (caller_username || caller?.username || "") || authorization.status !== "pending") return Response.json({ success: false, error: "Authorization request is not available" }, { status: 400 });
      if (new Date(authorization.expires_at).getTime() < Date.now()) { await base44.asServiceRole.entities.SchoolAccessAuthorization.update(authorization.id, { status: "expired" }); return Response.json({ success: false, error: "This authorization code has expired" }, { status: 400 }); }
      if (await hashAuthorizationCode(String(params.authorization_code || "")) !== authorization.otp_hash) return Response.json({ success: false, error: "The authorization code does not match" }, { status: 400 });
      await base44.asServiceRole.entities.SchoolAccessAuthorization.update(authorization.id, { status: "approved", verified_at: new Date().toISOString() });
      const { ip, userAgent } = extractRequestInfo(req);
      await base44.asServiceRole.entities.AuditLog.create({ event_type: "admin_action", action_type: "admin_school_access", username: caller_username || caller?.username || "", user_role: "admin", school_code: authorization.school_code, system_code: authorization.system_code, ip_address: ip, user_agent: userAgent, success: true, authorized_by_id: authorization.authorizer_id, authorized_by_name: authorization.authorizer_name, details: `Administrator accessed ${authorization.school_name} as manager. Authorized by ${authorization.authorizer_name}. Reason: ${authorization.reason}` });
      return Response.json({ success: true, school: { school_code: authorization.school_code, system_code: authorization.system_code, school_name: authorization.school_name } });
    }

    if (action === "access_school") return Response.json({ success: false, error: "School staff authorization is required before access" }, { status: 400 });

    if (action === "update_platform_admin") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("admin_management"))) return Response.json({ success: false, error: "Administrator management permission required" }, { status: 403 });
      const { user_id, email, full_name, admin_permissions } = params;
      if (!user_id || !full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") || !Array.isArray(admin_permissions)) return Response.json({ success: false, error: "Provide a name, valid SSO email address, and permissions" }, { status: 400 });
      const admin = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!admin || admin.role !== "admin") return Response.json({ success: false, error: "Platform administrator not found" }, { status: 404 });
      const allowedPermissions = ["school_access", "audit_access", "school_discovery", "admin_management"];
      if (admin_permissions.some((permission) => !allowedPermissions.includes(permission))) return Response.json({ success: false, error: "Invalid administrator permission" }, { status: 400 });
      await base44.asServiceRole.entities.Teacher.update(user_id, { full_name: full_name.trim(), email, admin_permissions });
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Updated administrator ${admin.username}`, "0000");
      return Response.json({ success: true });
    }

    if (action === "reset_platform_admin_password") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("admin_management"))) return Response.json({ success: false, error: "Administrator management permission required" }, { status: 403 });
      const { user_id, password } = params;
      const passwordError = validatePasswordComplexity(password);
      if (!user_id || passwordError) return Response.json({ success: false, error: passwordError || "Administrator is required" }, { status: 400 });
      const admin = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!admin || admin.role !== "admin") return Response.json({ success: false, error: "Platform administrator not found" }, { status: 404 });
      await base44.asServiceRole.entities.Teacher.update(user_id, { password, password_reset_required: true, failed_login_attempts: 0, locked_until: null });
      await logAudit(base44, "password_reset_admin", caller_username || "", callerRole, `Reset password for platform administrator ${admin.username}`, "0000");
      return Response.json({ success: true });
    }

    // --- PLATFORM ADMINISTRATION ---
    if (action === "list_platform_admins") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("admin_management"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const admins = await base44.asServiceRole.entities.Teacher.filter({ role: "admin" }, "full_name", 100);
      return Response.json({ success: true, admins: admins.map(({ password, mfa_code, mfa_code_expires_at, failed_login_attempts, locked_until, ...admin }) => admin) });
    }

    if (action === "create_platform_admin") {
      if (callerRole !== "admin" || (caller && Array.isArray(caller.admin_permissions) && !caller.admin_permissions.includes("admin_management"))) return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const { full_name, username, password } = params;
      if (!full_name || !/^adm\.[a-z]+$/.test(username || "") || !password) return Response.json({ success: false, error: "Provide a name, an adm.name username, and a temporary password" }, { status: 400 });
      const passwordError = validatePasswordComplexity(password);
      if (passwordError) return Response.json({ success: false, error: passwordError }, { status: 400 });
      const matches = await base44.asServiceRole.entities.Teacher.filter({ username }, undefined, 1);
      if (matches.length) return Response.json({ success: false, error: "That administrator username is already in use" }, { status: 409 });
      const admin = await base44.asServiceRole.entities.Teacher.create({ username, password, full_name, role: "admin", school_code: "0000", system_code: "000", school_name: "ReportAL 360", system_name: "ReportAL 360", email: `${username}@local.reportal360`, admin_permissions: ["school_access", "audit_access", "school_discovery", "admin_management"], teacher_id: username, active: true, mfa_enabled: false, password_reset_required: true });
      await logAudit(base44, "platform_admin_created", caller_username || "", callerRole, `Created platform administrator ${username}`, "0000");
      return Response.json({ success: true, admin: { id: admin.id, full_name: admin.full_name, username: admin.username } });
    }

    // --- CLIENT MANAGEMENT ---
    if (action === "list_clients") {
      if (callerRole !== "admin") return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const clients = await base44.asServiceRole.entities.Client.list("system_name", 500);
      return Response.json({ success: true, clients });
    }

    if (action === "save_client") {
      if (callerRole !== "admin") return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const { client_id, system_name, system_code, status, annual_cost, billing_frequency, support_sla_hours, renewal_date, notes, authorized_contacts, contracts } = params;
      if (!String(system_name || "").trim() || !String(system_code || "").trim()) return Response.json({ success: false, error: "System name and system code are required" }, { status: 400 });
      if (!['prospect', 'active', 'at_risk', 'inactive'].includes(status || 'active')) return Response.json({ success: false, error: "Choose a valid client status" }, { status: 400 });
      const contacts = Array.isArray(authorized_contacts) ? authorized_contacts.filter((contact) => contact?.name?.trim() && contact?.email?.trim()).map((contact) => ({ name: contact.name.trim(), email: contact.email.trim(), role: String(contact.role || '').trim(), phone: String(contact.phone || '').trim() })) : [];
      const clientData = { system_name: system_name.trim(), system_code: system_code.trim(), status, annual_cost: Number(annual_cost || 0), billing_frequency: billing_frequency || 'annual', support_sla_hours: Number(support_sla_hours || 0), renewal_date: renewal_date || null, notes: String(notes || '').trim(), authorized_contacts: contacts, contracts: Array.isArray(contracts) ? contracts : [] };
      if (client_id) {
        const existing = await base44.asServiceRole.entities.Client.get(client_id);
        if (!existing) return Response.json({ success: false, error: "Client record not found" }, { status: 404 });
        await base44.asServiceRole.entities.Client.update(client_id, clientData);
        await logAudit(base44, "admin_action", caller_username || "", callerRole, `Updated client ${clientData.system_name}`, undefined);
        return Response.json({ success: true });
      }
      const duplicate = await base44.asServiceRole.entities.Client.filter({ system_code: clientData.system_code }, undefined, 1);
      if (duplicate.length) return Response.json({ success: false, error: "A client with this system code already exists" }, { status: 409 });
      await base44.asServiceRole.entities.Client.create(clientData);
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Created client ${clientData.system_name}`, undefined);
      return Response.json({ success: true });
    }

    if (action === "delete_client") {
      if (callerRole !== "admin") return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      const client = await base44.asServiceRole.entities.Client.get(params.client_id);
      if (!client) return Response.json({ success: false, error: "Client record not found" }, { status: 404 });
      await base44.asServiceRole.entities.Client.delete(client.id);
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Deleted client ${client.system_name}`, undefined);
      return Response.json({ success: true });
    }

    // --- SELF SERVICE SETTINGS ---
    if (action === "update_self_settings") {
      if (!caller) return Response.json({ success: false, error: "Staff access required" }, { status: 403 });
      const allowed = ["profile_photo_url", "email_notifications", "message_notifications", "training_reminders"];
      const updateData = {};
      for (const field of allowed) if (params[field] !== undefined) updateData[field] = params[field];
      const updated = await base44.asServiceRole.entities.Teacher.update(caller.id, updateData);
      return Response.json({ success: true, user: updated });
    }

    // --- MASS EMAIL ---
    if (action === "send_mass_email") {
      const groups = Array.isArray(params.groups) ? params.groups : [];
      const subject = String(params.subject || "").trim();
      const message = String(params.message || "").trim();
      const isPlatformAdmin = callerRole === "admin";
      const validGroups = isPlatformAdmin ? ["teacher", "manager", "area"] : ["parent", "staff", "student"];
      if (!isPlatformAdmin && callerRole !== "manager") return Response.json({ success: false, error: "Manager access required" }, { status: 403 });
      if (!groups.length || groups.some((group) => !validGroups.includes(group))) return Response.json({ success: false, error: "Select at least one recipient group" }, { status: 400 });
      if (!subject || !message) return Response.json({ success: false, error: "Subject and message are required" }, { status: 400 });

      let emails = [];
      if (isPlatformAdmin) {
        const recipients = await base44.asServiceRole.entities.Teacher.list("email", 5000);
        const selectedRoles = new Set(groups.flatMap((group) => group === "manager" ? ["manager", "school_admin"] : group === "area" ? ["area", "commissioner"] : ["teacher"]));
        emails = recipients.filter((recipient) => recipient.active !== false && selectedRoles.has(recipient.role)).map((recipient) => recipient.email);
      } else {
        if (groups.includes("staff")) {
          const staff = await base44.asServiceRole.entities.Teacher.filter({ school_code: callerSchoolCode }, "email", 5000);
          emails.push(...staff.filter((recipient) => recipient.active !== false).map((recipient) => recipient.email));
        }
        if (groups.includes("student") || groups.includes("parent")) {
          const students = await base44.asServiceRole.entities.Student.filter({ school_code: callerSchoolCode }, "student_name", 5000);
          if (groups.includes("student")) emails.push(...students.map((student) => student.email));
          if (groups.includes("parent")) emails.push(...students.flatMap((student) => (student.emergency_contacts || []).map((contact) => contact.email)));
        }
      }
      emails = [...new Set(emails.filter(Boolean).map((email) => email.trim().toLowerCase()))];
      if (!emails.length) return Response.json({ success: false, error: "No recipients with email addresses match the selected groups" }, { status: 400 });

      const resendApiKey = secrets.get("RESEND_API_KEY");
      const configuredFrom = process.env.RESEND_FROM_EMAIL || "ReportAL 360 <onboarding@resend.dev>";
      const senderAddress = configuredFrom.match(/<([^>]+)>/)?.[1] || configuredFrom;
      const senderName = isPlatformAdmin ? "ReportAL 360" : `${caller.full_name || caller.username} at ${caller.school_name || "your school"}`;
      const from = `${senderName} <${senderAddress}>`;
      const footerNote = isPlatformAdmin ? "This message was sent by the ReportAL 360 administrator." : `This message was sent by ${senderName}.`;
      const html = buildEmailHtml({ heading: subject, message, footerNote });
      let sentCount = 0;
      for (const to of emails) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, subject, html }),
        });
        if (!response.ok) {
          const details = await response.text();
          return Response.json({ success: false, error: `Email delivery failed: ${details.slice(0, 240)}` }, { status: 502 });
        }
        sentCount += 1;
      }
      await logAudit(base44, "admin_action", caller_username || "", callerRole, `Sent mass email to ${sentCount} recipients in groups: ${groups.join(", ")}`, callerSchoolCode || undefined);
      return Response.json({ success: true, sent_count: sentCount });
    }

    // --- BULK CREATE ---
    if (action === "bulk_create") {
      const { records, school_code, system_code, school_name, system_name } = params;
      if (!Array.isArray(records) || records.length === 0 || records.length > 100) return Response.json({ success: false, error: "Upload between 1 and 100 staff records" }, { status: 400 });
      if (!school_code || !system_code) return Response.json({ success: false, error: "School details are required" }, { status: 400 });
      if (["area", "commissioner"].includes(callerRole) && system_code !== callerSystemCode) return Response.json({ success: false, error: "You can only create users in your system" }, { status: 403 });
      if (callerRole === "manager" && (system_code !== callerSystemCode || school_code !== callerSchoolCode)) return Response.json({ success: false, error: "You can only create users in your school" }, { status: 403 });
      if (!["admin", "area", "commissioner", "manager"].includes(callerRole)) return Response.json({ success: false, error: "Not authorized to create users" }, { status: 403 });
      const credentials = [];
      const errors = [];
      const subjectRecords = await base44.asServiceRole.entities.Subject.list("name", 500);
      const subjectsByName = new Map(subjectRecords.map((subject) => [subject.name.trim().toLowerCase(), subject]));
      const importedSubjectRooms = new Map();

      for (let index = 0; index < records.length; index++) {
        const item = records[index];
        const full_name = item.full_name?.trim();
        const email = item.email?.trim();
        const role = (item.role || "teacher").trim().toLowerCase();
        if (!full_name || !email || !["area", "manager", "teacher"].includes(role)) { errors.push(`Row ${index + 2}: full_name, email, and a valid role are required`); continue; }
        if (["area", "commissioner"].includes(callerRole) && role === "area") { errors.push(`Row ${index + 2}: only admins can create area users`); continue; }
        if (callerRole === "manager" && !["manager", "teacher"].includes(role)) { errors.push(`Row ${index + 2}: managers can only create school managers or teachers`); continue; }
        const username = item.username?.trim() || makeUsername(school_code, full_name);
        const existing = await base44.asServiceRole.entities.Teacher.filter({ username }, undefined, 1);
        if (existing.length > 0) { errors.push(`Row ${index + 2}: username ${username} already exists`); continue; }
        const customPassword = item.password?.trim();
        const passwordError = customPassword ? validatePasswordComplexity(customPassword) : null;
        if (passwordError) { errors.push(`Row ${index + 2}: ${passwordError}`); continue; }
        const schoolLevelCode = item.school_level?.trim().toUpperCase();
        const teachingLevel = { E: "elementary", M: "middle", H: "high" }[schoolLevelCode];
        if (!teachingLevel) { errors.push(`Row ${index + 2}: school_level is required and must be E, M, or H`); continue; }
        const subjectNames = (item.subject || "").split(";").map((name) => name.trim()).filter(Boolean);
        const gradeSelection = resolveGradeLevels(teachingLevel, (item.grades || "").split(";").map((grade) => grade.trim()).filter(Boolean), role);
        if (gradeSelection.error) { errors.push(`Row ${index + 2}: ${gradeSelection.error}`); continue; }
        const gradeLevels = gradeSelection.gradeLevels;
        const workingDaySelection = resolveWorkingDays((item.working_days || "").split(";").map((day) => day.trim()).filter(Boolean));
        if (workingDaySelection.error) { errors.push(`Row ${index + 2}: ${workingDaySelection.error}`); continue; }
        const roomName = item.room?.trim() || "";
        const temp_password = customPassword || generateRandomPassword();
        await base44.asServiceRole.entities.Teacher.create({ username, password: temp_password, full_name, role, school_code, system_code, school_name: school_name || "", system_name: system_name || "", email, subject: subjectNames[0] || "", subjects: subjectNames, grade_levels: gradeLevels, teaching_levels: [teachingLevel], working_days: workingDaySelection.workingDays, room: roomName, teacher_id: username, password_reset_required: true });
        credentials.push({ full_name, username, temp_password });
        for (const subjectName of subjectNames) {
          const key = subjectName.toLowerCase();
          const imported = importedSubjectRooms.get(key) || { name: subjectName, rooms: new Set() };
          if (roomName) imported.rooms.add(roomName);
          importedSubjectRooms.set(key, imported);
        }
      }

      let subjectsCreated = 0;
      let roomsAdded = 0;
      for (const [key, imported] of importedSubjectRooms) {
        const existingSubject = subjectsByName.get(key);
        if (!existingSubject) {
          await base44.asServiceRole.entities.Subject.create({ name: imported.name, rooms: [...imported.rooms] });
          subjectsCreated++;
          roomsAdded += imported.rooms.size;
          continue;
        }
        const existingRooms = existingSubject.rooms || [];
        const knownRooms = new Set(existingRooms.map((room) => room.toLowerCase()));
        const newRooms = [...imported.rooms].filter((room) => !knownRooms.has(room.toLowerCase()));
        if (newRooms.length > 0) {
          await base44.asServiceRole.entities.Subject.update(existingSubject.id, { rooms: [...existingRooms, ...newRooms] });
          roomsAdded += newRooms.length;
        }
      }

      await logAudit(base44, "staff_bulk_created", caller_username || "", callerRole, `Created ${credentials.length} staff accounts, ${subjectsCreated} subjects, and ${roomsAdded} room assignments at ${school_code}`, school_code);
      return Response.json({ success: true, count: credentials.length, credentials, errors, subjects_created: subjectsCreated, rooms_added: roomsAdded });
    }

    // --- CREATE SYSTEM USER ---
    if (action === "create_system_user") {
      const { full_name, system_code, system_name, email, username: customUsername, password: customPassword } = params;
      if (callerRole !== "admin") return Response.json({ success: false, error: "Platform administrator access required" }, { status: 403 });
      if (!full_name || !system_code || !email) return Response.json({ success: false, error: "full_name, email, and system_code are required" }, { status: 400 });

      const username = (customUsername || "").trim() || makeUsername(system_code, full_name);
      const existing = await base44.asServiceRole.entities.Teacher.filter({ username });
      if (existing.length > 0) return Response.json({ success: false, error: "A user with this name already exists" }, { status: 400 });

      const tempPassword = (customPassword || "").trim() || generateRandomPassword();
      if (customPassword?.trim()) {
        const pwError = validatePasswordComplexity(tempPassword);
        if (pwError) return Response.json({ success: false, error: pwError }, { status: 400 });
      }

      const created = await base44.asServiceRole.entities.Teacher.create({
        username,
        password: tempPassword,
        full_name,
        role: "commissioner",
        school_code: "0000",
        system_code,
        school_name: "All Schools",
        system_name: system_name || "",
        email,
        grade_levels: [],
        teaching_levels: [],
        working_days: [],
        subjects: [],
        password_reset_required: true,
        teacher_id: username,
      });
      await logAudit(base44, "user_created", caller_username || "", callerRole, `Created system user ${username} for ${system_code}`, "0000");
      return Response.json({ success: true, user: { id: created.id, username: created.username, full_name: created.full_name, role: created.role }, temp_password: tempPassword });
    }

    // --- CREATE ---
    if (action === "create") {
      const { full_name, role, school_code, system_code, school_name, system_name, email, username: customUsername, password: customPassword, subject, subjects, grade_levels, teaching_levels, working_days, room, coach } = params;

      if (!full_name || !role || !school_code || !system_code || !email) {
        return Response.json(
          { success: false, error: "full_name, email, role, school_code, system_code are required" },
          { status: 400 }
        );
      }

      // Permission checks
      if (callerRole === "admin") {
        // admin can create any role anywhere
      } else if (["area", "commissioner"].includes(callerRole)) {
        if (system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "You can only create users in your system" }, { status: 403 });
        }
        if (["area", "commissioner"].includes(role)) {
          return Response.json({ success: false, error: "Only admins can create area users" }, { status: 403 });
        }
      } else if (callerRole === "manager") {
        if (system_code !== callerSystemCode || school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "You can only create users in your school" }, { status: 403 });
        }
        if (!["manager", "teacher"].includes(role)) {
          return Response.json({ success: false, error: "Managers can only create school manager or teacher accounts" }, { status: 403 });
        }
      } else {
        return Response.json({ success: false, error: "Not authorized to create users" }, { status: 403 });
      }

      const isSystemUser = ["area", "commissioner"].includes(role);
      const teachingLevel = Array.isArray(teaching_levels) ? teaching_levels[0] : "";
      const gradeSelection = isSystemUser
        ? { gradeLevels: [] }
        : resolveGradeLevels(teachingLevel, grade_levels, role);
      if (gradeSelection.error) return Response.json({ success: false, error: gradeSelection.error }, { status: 400 });
      const workingDaySelection = resolveWorkingDays(working_days);
      if (workingDaySelection.error) return Response.json({ success: false, error: workingDaySelection.error }, { status: 400 });

      const username = (customUsername || "").trim() || (school_code === "0000" ? makeUsername(system_code, full_name) : makeUsername(school_code, full_name));

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
        subject: subject || subjects?.[0] || "",
        subjects: Array.isArray(subjects) ? subjects : (subject ? [subject] : []),
        grade_levels: gradeSelection.gradeLevels,
        teaching_levels: isSystemUser ? [] : [teachingLevel],
        working_days: workingDaySelection.workingDays,
        room: room || "",
        teacher_id: username,
        coach: Boolean(coach),
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
      } else if (["area", "commissioner"].includes(callerRole)) {
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
      if (updates.working_days !== undefined) {
        const workingDaySelection = resolveWorkingDays(updates.working_days);
        if (workingDaySelection.error) return Response.json({ success: false, error: workingDaySelection.error }, { status: 400 });
        updates.working_days = workingDaySelection.workingDays;
      }
      const allowedFields = ["full_name", "email", "subject", "subjects", "grade_levels", "working_days", "room", "department", "job_title", "active", "role", "coach", "mfa_enabled", "target_free_periods"];
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