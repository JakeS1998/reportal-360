import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const managementRoles = ['admin', 'manager', 'area', 'school_admin'];
const toMinutes = (value) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
const occursInWeek = (event, from, to) => event.date >= from && event.date <= to || (event.recurrence === 'weekly' && event.date <= to) || (event.recurrence === 'monthly' && event.date <= to);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req); const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const admin = getAdminCredentials();
    const caller = caller_username === admin.username && caller_password === admin.password ? { id: 'admin', full_name: 'Administrator', role: 'admin', school_code: params.school_code } : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || caller.active === false) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const schoolCode = params.school_code || caller.school_code;
    if (!schoolCode || (caller.role !== 'admin' && caller.role !== 'area' && caller.school_code !== schoolCode)) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const schoolSchedules = await base44.asServiceRole.entities.ClassSchedule.filter({ school_code: schoolCode }, undefined, 500);
    const callerClassIds = schoolSchedules.filter((slot) => slot.teacher_id === caller.id).map((slot) => slot.class_id);
    if (action === 'list') {
      const events = await base44.asServiceRole.entities.CalendarEvent.filter({ school_code: schoolCode, status: 'active' }, 'date', 500);
      const visible = events.filter((event) => occursInWeek(event, params.from_date, params.to_date) && (event.visibility === 'personal' ? event.creator_id === caller.id : event.affected_teacher_ids?.includes(caller.id)));
      return Response.json({ success: true, events: visible });
    }
    if (action === 'students') {
      const all = await base44.asServiceRole.entities.Student.filter({ school_code: schoolCode, status: 'active' }, 'student_name', 500);
      if (managementRoles.includes(caller.role)) return Response.json({ success: true, students: all });
      const enrolments = await base44.asServiceRole.entities.StudentClass.filter({ school_code: schoolCode, status: 'active' }, undefined, 500);
      const allowed = new Set(enrolments.filter((row) => callerClassIds.includes(row.class_id)).map((row) => row.student_id));
      return Response.json({ success: true, students: all.filter((student) => allowed.has(student.id)) });
    }
    if (action === 'teachers') {
      if (!managementRoles.includes(caller.role)) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
      const teachers = await base44.asServiceRole.entities.Teacher.filter({ school_code: schoolCode, active: true }, 'full_name', 500);
      return Response.json({ success: true, teachers });
    }
    if (action === 'save') {
      const event = params.event || {}; const editing = event.id ? await base44.asServiceRole.entities.CalendarEvent.get(event.id) : null;
      if (editing && editing.creator_id !== caller.id && !managementRoles.includes(caller.role)) return Response.json({ success: false, error: 'Only the creator can edit this event' }, { status: 403 });
      if (!event.title?.trim() || !event.date || !event.start_time || !event.end_time || toMinutes(event.end_time) <= toMinutes(event.start_time)) return Response.json({ success: false, error: 'Add a title and valid date and time range' }, { status: 400 });
      if (event.visibility === 'drill' && !managementRoles.includes(caller.role)) return Response.json({ success: false, error: 'Manager access required for drills' }, { status: 403 });
      if (event.visibility === 'school_event' && !managementRoles.includes(caller.role) && !(event.affected_student_ids || []).length) return Response.json({ success: false, error: 'Select one or more of your students' }, { status: 400 });
      let recipientIds = [caller.id];
      if (event.visibility !== 'personal') {
        const onSlot = schoolSchedules.filter((slot) => slot.day_of_week === weekday(event.date) && toMinutes(slot.start_time) < toMinutes(event.end_time) && toMinutes(slot.end_time) > toMinutes(event.start_time));
        if (event.visibility === 'drill') recipientIds = event.affected_teacher_ids?.length ? event.affected_teacher_ids : [...new Set(onSlot.map((slot) => slot.teacher_id))];
        else if (event.is_school_wide) recipientIds = [...new Set(onSlot.map((slot) => slot.teacher_id))];
        else {
          const enrolments = await base44.asServiceRole.entities.StudentClass.filter({ school_code: schoolCode, status: 'active' }, undefined, 500);
          const affectedClasses = new Set(enrolments.filter((row) => (event.affected_student_ids || []).includes(row.student_id)).map((row) => row.class_id));
          recipientIds = [...new Set(onSlot.filter((slot) => affectedClasses.has(slot.class_id)).map((slot) => slot.teacher_id).concat(caller.id))];
        }
      }
      const payload = { school_code: schoolCode, creator_id: editing?.creator_id || caller.id, creator_name: editing?.creator_name || caller.full_name || caller.username || 'Staff member', event_type: event.visibility === 'drill' ? 'drill' : event.event_type, drill_type: event.drill_type || '', title: event.title.trim(), notes: event.notes || '', date: event.date, start_time: event.start_time, end_time: event.end_time, recurrence: event.recurrence || 'none', affected_student_ids: event.affected_student_ids || [], affected_teacher_ids: recipientIds, is_school_wide: Boolean(event.is_school_wide), visibility: event.visibility, status: 'active' };
      const saved = editing ? await base44.asServiceRole.entities.CalendarEvent.update(editing.id, payload) : await base44.asServiceRole.entities.CalendarEvent.create(payload);
      return Response.json({ success: true, event: saved });
    }
    if (action === 'delete') {
      const event = await base44.asServiceRole.entities.CalendarEvent.get(params.event_id);
      if (!event || event.school_code !== schoolCode) return Response.json({ success: false, error: 'Event not found' }, { status: 404 });
      if (event.creator_id !== caller.id && !managementRoles.includes(caller.role)) return Response.json({ success: false, error: 'Only the creator or a manager can remove this event' }, { status: 403 });
      await base44.asServiceRole.entities.CalendarEvent.update(event.id, { status: 'cancelled' }); return Response.json({ success: true });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
}