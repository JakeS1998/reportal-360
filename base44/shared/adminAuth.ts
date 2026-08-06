import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAdminCredentials } from './security.ts';

// Verifies admin credentials (env-var backed). Returns true if valid.
export async function verifyAdmin(req, body) {
  try {
    const b = body || (await req.clone().json().catch(() => ({})));
    const { username, password, scheduled } = b || {};
    // Scheduled workflow calls run with service role and pass scheduled=true
    if (scheduled === true) return true;
    if (verifyAdminCredentials(username, password)) return true;
    // Also allow platform admins
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role === "admin") return true;
    return false;
  } catch {
    return false;
  }
}