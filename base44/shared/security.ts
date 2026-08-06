// Shared security utilities for FERPA compliance

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

export async function logAudit(
  base44: any,
  eventType: string,
  username: string,
  role: string,
  details: string,
  schoolCode?: string
): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: eventType,
      username: username || "",
      user_role: role || "",
      school_code: schoolCode || "",
      details: details || "",
    });
  } catch (e) {
    // Audit logging must never block the primary operation
  }
}