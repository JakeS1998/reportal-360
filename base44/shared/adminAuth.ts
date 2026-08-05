import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_USERNAME = "BRGAdmin";
const ADMIN_PASSWORD = "BRGAdmin";

// Verifies admin credentials (hardcoded BRGAdmin). Returns true if valid.
export async function verifyAdmin(req, body) {
  try {
    const b = body || (await req.clone().json().catch(() => ({})));
    const { username, password, scheduled } = b || {};
    // Scheduled workflow calls run with service role and pass scheduled=true
    if (scheduled === true) return true;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) return true;
    // Also allow platform admins
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role === "admin") return true;
    return false;
  } catch {
    return false;
  }
}