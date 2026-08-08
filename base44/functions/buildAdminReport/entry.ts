import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { buildReportAnalytics } from '../../shared/reportAnalytics.ts';

export default async function(req) {
  try {
    const { caller_username, caller_password, ...config } = await req.json();
    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();
    let authorised = caller_username === admin.username && caller_password === admin.password;
    let caller = null;
    if (!authorised && caller_username) {
      caller = (await base44.asServiceRole.entities.Teacher.filter({ username: caller_username, password: caller_password }, undefined, 1))[0];
      authorised = !!caller && ["manager", "area"].includes(caller.role) && (caller.role !== "manager" || caller.school_code === config.school_code);
      if (authorised && caller.role === "area") {
        const directory = await base44.asServiceRole.entities.SchoolDirectory.filter({ school_code: config.school_code }, undefined, 1);
        authorised = directory[0]?.system_code === caller.system_code;
      }
    }
    if (!authorised) return Response.json({ success: false, error: "Administrator access is required." }, { status: 403 });
    if (!config.school_code) return Response.json({ success: false, error: "School is required." }, { status: 400 });
    return Response.json({ success: true, ...(await buildReportAnalytics(base44, config)) });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}