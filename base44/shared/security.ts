// Shared security utilities for FERPA compliance
// Centralizes audit logging, password validation, request info extraction,
// and admin credential management across all backend functions.

// ---------------------------------------------------------------------------
// Password Complexity Validation
// ---------------------------------------------------------------------------

export function validatePasswordComplexity(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Request Info Extraction (IP + User Agent)
// ---------------------------------------------------------------------------

export function extractRequestInfo(req: any): { ip: string; userAgent: string } {
  const headers = req?.headers || {};
  const get = (key: string) => {
    if (typeof headers.get === "function") return headers.get(key);
    return headers[key] || "";
  };
  const forwarded = get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || get("x-real-ip") || "unknown";
  const userAgent = get("user-agent") || "unknown";
  return { ip, userAgent };
}

// ---------------------------------------------------------------------------
// Admin Credential Management (env-var backed)
// ---------------------------------------------------------------------------

export function getAdminCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || "BRGAdmin",
    password: process.env.ADMIN_PASSWORD || "BRGAdmin",
  };
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const admin = getAdminCredentials();
  return username === admin.username && password === admin.password;
}

export function validateRequiredSecrets(): { missing: string[]; usingFallback: boolean } {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  const usingFallback = !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD;
  return { missing, usingFallback };
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

export async function logAudit(
  base44: any,
  eventType: string,
  username: string,
  role: string,
  details: string,
  schoolCode?: string,
  extra?: Record<string, any>
): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: eventType,
      username: username || "",
      user_role: role || "",
      school_code: schoolCode || "",
      details: details || "",
      ip_address: extra?.ip_address || "",
      user_agent: extra?.user_agent || "",
      system_code: extra?.system_code || "",
      student_id: extra?.student_id || "",
      success: extra?.success !== undefined ? extra.success : true,
      export_format: extra?.export_format || "",
      export_record_count: extra?.export_record_count || 0,
      report_name: extra?.report_name || "",
      action_type: extra?.action_type || eventType,
    });
  } catch (e) {
    // Audit logging must never block the primary operation
  }
}

// Log a student record access event (FERPA audit)
export async function logStudentAccess(
  base44: any,
  actionType: string,
  user: { username: string; role: string; school_code?: string; system_code?: string },
  studentId: string,
  req: any,
  success: boolean = true
): Promise<void> {
  const { ip, userAgent } = extractRequestInfo(req);
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: actionType,
      action_type: actionType,
      username: user.username || "",
      user_role: user.role || "",
      school_code: user.school_code || "",
      system_code: user.system_code || "",
      student_id: studentId || "",
      ip_address: ip,
      user_agent: userAgent,
      success,
      details: `${actionType.replace(/_/g, " ")} — student ${studentId}`,
    });
  } catch (e) {
    // Audit logging must never block
  }
}

// Log a data export event
export async function logExport(
  base44: any,
  user: { username: string; role: string; school_code?: string; system_code?: string },
  reportName: string,
  format: string,
  recordCount: number,
  req: any
): Promise<void> {
  const { ip, userAgent } = extractRequestInfo(req);
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: "data_export",
      action_type: "export_student_data",
      username: user.username || "",
      user_role: user.role || "",
      school_code: user.school_code || "",
      system_code: user.system_code || "",
      ip_address: ip,
      user_agent: userAgent,
      success: true,
      export_format: format,
      export_record_count: recordCount,
      report_name: reportName,
      details: `Exported "${reportName}" (${format}) — ${recordCount} records`,
    });
  } catch (e) {
    // Audit logging must never block
  }
}