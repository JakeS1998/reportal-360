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
        const schedules = await base44.asServiceRole.entities.ClassSchedule.filter({ school_code: schoolCode }, 'start_time', 2000);
        const now = new Date();
        const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const weekdayIndex = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        const missingPlanSchedules = schedules.flatMap((schedule) => {
          const start = new Date(schedule.start_date || now.toISOString().slice(0, 10));
          const targetDay = weekdayIndex[schedule.day_of_week];
          if (targetDay === undefined) return [];
          const occurrence = new Date(now);
          occurrence.setHours(0, 0, 0, 0);
          occurrence.setDate(occurrence.getDate() + ((targetDay - occurrence.getDay() + 7) % 7));
          occurrence.setHours(...schedule.start_time.split(':').map(Number), 0, 0);
          if (occurrence < now) occurrence.setDate(occurrence.getDate() + 7);
          const recurrenceType = schedule.recurrence_type || 'weekly';
          const weeksSinceStart = Math.floor((occurrence.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const isActive = occurrence >= start && (recurrenceType === 'weekly' || recurrenceType === 'cycle' || (recurrenceType === 'biweekly' && weeksSinceStart % 2 === 0) || (recurrenceType === 'none' && weeksSinceStart === 0));
          const lessonDate = occurrence.toISOString().slice(0, 10);
          const approved = plans.some((plan) => plan.class_id === schedule.class_id && plan.lesson_date === lessonDate && plan.status === 'approved');
          if (!isActive || occurrence > cutoff || approved) return [];
          return [{ schedule_id: schedule.id, class_name: schedule.class_name || 'Class', starts_at: occurrence.toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) }];
        });
        const upcomingMissingPlans = Object.values(missingPlanSchedules.reduce((byClass, item) => {
          if (!byClass[item.class_name] || item.starts_at < byClass[item.class_name].starts_at) byClass[item.class_name] = item;
          return byClass;
        }, {}));
        return Response.json({ success: true, plans: plans.filter((p) => p.status === 'pending_review'), upcomingMissingPlans });
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
        if (existing.status === 'approved') return Response.json({ success: false, error: 'Approved lesson plans are locked' }, { status: 403 });
        const updated = await base44.asServiceRole.entities.LessonPlan.update(id, payload);
        return Response.json({ success: true, plan: updated });
      }
      const created = await base44.asServiceRole.entities.LessonPlan.create({ ...payload, owner_id: caller.id, owner_name: caller.full_name || caller.username });
      return Response.json({ success: true, plan: created });
    }
    if (action === 'clone') {
      const source = await base44.asServiceRole.entities.LessonPlan.get(params.plan_id);
      if (!source || source.school_code !== schoolCode || (!manager && source.owner_id !== caller.id && !source.shared)) return Response.json({ success: false, error: 'Plan unavailable' }, { status: 403 });
      const targetClassId = params.target_class_id || source.class_id;
      if (!(await canAuthorClass(targetClassId))) return Response.json({ success: false, error: 'Not assigned to this class' }, { status: 403 });
      const { id, created_date, updated_date, created_by_id, reviewed_by, reviewed_at, review_notes, ...copy } = source;
      const cloned = await base44.asServiceRole.entities.LessonPlan.create({ ...copy, class_id: targetClassId, class_name: params.target_class_name || source.class_name, schedule_id: params.target_class_id ? '' : source.schedule_id, title: `${copy.title} (Copy)`, owner_id: caller.id, owner_name: caller.full_name || caller.username, status: 'draft', shared: false });
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