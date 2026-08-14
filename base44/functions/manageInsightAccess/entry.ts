import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, school_code, caller_username, caller_password, caller_email, caller_sso, allowed_teacher_metrics } = body;
    let caller: any = null;
    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      caller = { role: 'admin' };
    } else {
      caller = await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    }
    if (!caller || !school_code) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const canAccessSchool = caller.role === 'admin' || caller.role === 'area' || caller.school_code === school_code;
    if (!canAccessSchool) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const configs = await base44.asServiceRole.entities.InsightAccessConfig.filter({ school_code }, undefined, 1);
    if (action === 'get') {
      return Response.json({ success: true, allowed_teacher_metrics: configs[0]?.allowed_teacher_metrics || null });
    }
    if (action === 'save') {
      if (!['admin', 'area', 'manager', 'school_admin'].includes(caller.role)) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
      if (!Array.isArray(allowed_teacher_metrics)) return Response.json({ success: false, error: 'Metrics are required' }, { status: 400 });
      const data = { allowed_teacher_metrics: [...new Set(allowed_teacher_metrics)] };
      if (configs[0]) await base44.asServiceRole.entities.InsightAccessConfig.update(configs[0].id, data);
      else await base44.asServiceRole.entities.InsightAccessConfig.create({ school_code, ...data });
      return Response.json({ success: true, allowed_teacher_metrics: data.allowed_teacher_metrics });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}