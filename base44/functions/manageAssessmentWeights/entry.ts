import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';
import { getAdminCredentials } from '../../shared/security.ts';

const types = ['classwork', 'quiz', 'test', 'essay', 'project', 'homework', 'presentation', 'other'];

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, school_code, weights } = body;
    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();
    const caller = caller_username === admin.username && caller_password === admin.password
      ? { role: 'admin' }
      : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const targetSchool = school_code || caller.school_code;
    if (!targetSchool || (caller.role !== 'admin' && caller.school_code !== targetSchool)) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const existing = await base44.asServiceRole.entities.AssessmentWeightConfig.filter({ school_code: targetSchool }, undefined, 1);
    if (action === 'get') return Response.json({ success: true, weights: existing[0] || {} });
    if (action !== 'save' || !['admin', 'area', 'manager'].includes(caller.role)) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
    const cleanWeights = Object.fromEntries(types.map((type) => [type, Number(weights?.[type] || 0)]));
    if (Object.values(cleanWeights).some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ success: false, error: 'Weights must be positive numbers' }, { status: 400 });
    if (Object.values(cleanWeights).reduce((sum, value) => sum + value, 0) !== 100) return Response.json({ success: false, error: 'Weights must total 100%' }, { status: 400 });
    const config = existing[0]
      ? await base44.asServiceRole.entities.AssessmentWeightConfig.update(existing[0].id, cleanWeights)
      : await base44.asServiceRole.entities.AssessmentWeightConfig.create({ school_code: targetSchool, ...cleanWeights });
    return Response.json({ success: true, weights: config });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}