import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const { username: adminUsername, password: adminPassword } = getAdminCredentials();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const body = await req.json();
    const { caller_username, caller_password, caller_email, caller_sso, student_id, source_class_id, date } = body;
    const base44 = createClientFromRequest(req);
    const caller = caller_username === adminUsername && caller_password === adminPassword
      ? { id: 'admin', role: 'admin', school_code: '' }
      : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || !['teacher', 'manager', 'area', 'school_admin', 'admin'].includes(caller.role)) return Response.json({ success: false, error: 'Staff access required' }, { status: 403 });
    if (!student_id || !source_class_id || !date) return Response.json({ success: false, error: 'Student, class and date are required' }, { status: 400 });

    const [student, sourceClass] = await Promise.all([
      base44.asServiceRole.entities.Student.get(student_id),
      base44.asServiceRole.entities.Class.get(source_class_id),
    ]);
    if (!student || !sourceClass) return Response.json({ success: false, error: 'Student or class is unavailable' }, { status: 400 });
    if (student.school_code !== sourceClass.school_code || (caller.role !== 'admin' && caller.school_code !== student.school_code)) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    if (caller.role === 'teacher') {
      const [assignment, enrollment] = await Promise.all([
        base44.asServiceRole.entities.TeacherClass.filter({ class_id: source_class_id, teacher_id: caller.id }, undefined, 1),
        base44.asServiceRole.entities.StudentClass.filter({ class_id: source_class_id, student_id, status: 'active' }, undefined, 1),
      ]);
      if (!assignment.length || !enrollment.length) return Response.json({ success: false, error: 'You can only assign detention to students in your class' }, { status: 403 });
    }

    const existingSessions = await base44.asServiceRole.entities.DetentionSession.filter({ school_code: student.school_code, date, status: 'scheduled' }, undefined, 1);
    let session = existingSessions[0];
    if (!session) {
      const dayName = weekdays[new Date(`${date}T00:00:00`).getDay()];
      const weeklySchedules = await base44.asServiceRole.entities.ClassSchedule.filter({ school_code: student.school_code, day_of_week: dayName }, undefined, 200);
      const templates = await Promise.all(weeklySchedules.filter((schedule) => schedule.recurrence_type === 'weekly' || schedule.recurrence_type === 'biweekly').map(async (schedule) => ({ schedule, classInfo: await base44.asServiceRole.entities.Class.get(schedule.class_id) })));
      const template = templates.find(({ schedule, classInfo }) => schedule.teacher_id && `${classInfo?.class_name || ''} ${classInfo?.subject || ''}`.toLowerCase().includes('detention'));
      if (!template) return Response.json({ success: false, error: `No detention staff member is scheduled for ${dayName}` }, { status: 400 });
      const staff = await base44.asServiceRole.entities.Teacher.get(template.schedule.teacher_id);
      if (!staff || staff.active === false) return Response.json({ success: false, error: 'The scheduled detention staff member is unavailable' }, { status: 400 });
      const startTime = template.schedule.start_time;
      const endTime = template.schedule.end_time;
      const className = `Detention · ${date}`;
      const detentionClass = await base44.asServiceRole.entities.Class.create({ class_name: className, school_code: student.school_code, school_name: sourceClass.school_name || '', subject: 'Detention', teacher_name: staff.full_name || staff.username, status: 'active', sessions_per_week: 1 });
      const schedule = await base44.asServiceRole.entities.ClassSchedule.create({ class_id: detentionClass.id, class_name: className, school_code: student.school_code, teacher_id: staff.id, teacher_name: staff.full_name || staff.username, day_of_week: dayName, start_time: startTime, end_time: endTime, recurrence_type: 'none', recurrence_weeks: 1, start_date: date });
      await base44.asServiceRole.entities.TeacherClass.create({ teacher_id: staff.id, class_id: detentionClass.id, school_code: student.school_code, teacher_name: staff.full_name || staff.username, role: 'Primary Teacher' });
      session = await base44.asServiceRole.entities.DetentionSession.create({ school_code: student.school_code, class_id: detentionClass.id, schedule_id: schedule.id, staff_id: staff.id, staff_name: staff.full_name || staff.username, date, start_time: startTime, end_time: endTime, status: 'scheduled' });
    }
    const enrolled = await base44.asServiceRole.entities.StudentClass.filter({ class_id: session.class_id, student_id, status: 'active' }, undefined, 1);
    if (!enrolled.length) await base44.asServiceRole.entities.StudentClass.create({ student_id, student_name: student.student_name, class_id: session.class_id, school_code: student.school_code, start_date: date, status: 'active' });
    return Response.json({ success: true, session, already_assigned: enrolled.length > 0 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}