import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const admin = getAdminCredentials();
    let caller;
    if (caller_username === admin.username && caller_password === admin.password) {
      caller = { id: 'admin', username: 'admin', full_name: 'Administrator', role: 'admin' };
    } else {
      caller = await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    }
    if (!caller || caller.active === false) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const manager = ['admin', 'manager', 'area', 'school_admin'].includes(caller.role);
    const schoolCode = params.school_code || params.plan?.school_code;
    if (!schoolCode) return Response.json({ success: false, error: 'school_code required' }, { status: 400 });
    if (!manager && caller.school_code !== schoolCode) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const canAuthorClass = async (classId) => {
      if (manager) return true;
      const assignments = await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: caller.id, class_id: classId }, undefined, 1);
      return assignments.length > 0;
    };
    if (action === 'list') {
      const plans = await base44.asServiceRole.entities.LessonPlan.filter({ school_code: schoolCode }, '-updated_date', 500);
      if (params.scope === 'review') {
        if (!manager) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
        return Response.json({ success: true, plans: plans.filter((p) => p.status === 'pending_review') });
      }
      return Response.json({ success: true, plans: manager ? plans : plans.filter((p) => p.owner_id === caller.id || p.shared) });
    }
    if (action === 'save') {
      const plan = params.plan || {};
      if (!plan.class_id || !plan.title) return Response.json({ success: false, error: 'Class and lesson title are required' }, { status: 400 });
      if (!(await canAuthorClass(plan.class_id))) return Response.json({ success: false, error: 'Not assigned to this class' }, { status: 403 });
      const { id, owner_id, owner_name, reviewed_by, reviewed_at, review_notes, ...editablePlan } = plan;
      const payload = { ...editablePlan, school_code: schoolCode, status: plan.status === 'pending_review' ? 'pending_review' : 'draft' };
      if (id) {
        const existing = await base44.asServiceRole.entities.LessonPlan.get(id);
        if (!existing || existing.school_code !== schoolCode || (!manager && existing.owner_id !== caller.id)) return Response.json({ success: false, error: 'Plan unavailable' }, { status: 403 });
        const updated = await base44.asServiceRole.entities.LessonPlan.update(id, payload);
        return Response.json({ success: true, plan: updated });
      }
      const created = await base44.asServiceRole.entities.LessonPlan.create({ ...payload, owner_id: caller.id, owner_name: caller.full_name || caller.username });
      return Response.json({ success: true, plan: created });
    }
    if (action === 'clone') {
      const source = await base44.asServiceRole.entities.LessonPlan.get(params.plan_id);
      if (!source || source.school_code !== schoolCode || (!manager && source.owner_id !== caller.id && !source.shared)) return Response.json({ success: false, error: 'Plan unavailable' }, { status: 403 });
      const { id, created_date, updated_date, created_by_id, reviewed_by, reviewed_at, review_notes, ...copy } = source;
      const cloned = await base44.asServiceRole.entities.LessonPlan.create({ ...copy, title: `${copy.title} (Copy)`, owner_id: caller.id, owner_name: caller.full_name || caller.username, status: 'draft', shared: false });
      return Response.json({ success: true, plan: cloned });
    }
    if (action === 'review') {
      if (!manager) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
      const plan = await base44.asServiceRole.entities.LessonPlan.get(params.plan_id);
      if (!plan || plan.school_code !== schoolCode) return Response.json({ success: false, error: 'Plan not found' }, { status: 404 });
      const status = params.status === 'approved' ? 'approved' : 'revision_requested';
      const updated = await base44.asServiceRole.entities.LessonPlan.update(plan.id, { status, review_notes: params.review_notes || '', reviewed_by: caller.full_name || caller.username, reviewed_at: new Date().toISOString() });
      return Response.json({ success: true, plan: updated });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}