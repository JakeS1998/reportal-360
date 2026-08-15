import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';
import { getAdminCredentials } from '../../shared/security.ts';

const statuses = ['present', 'absent', 'late', 'excused'];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function scheduleRunsOnDate(schedule, date) {
  const target = new Date(`${date}T12:00:00`);
  if (schedule.day_of_week !== days[target.getDay()]) return false;
  if (!schedule.start_date) return true;
  const start = new Date(`${schedule.start_date}T12:00:00`);
  if (target < start) return false;
  const weeks = Math.floor((target.getTime() - start.getTime()) / 604800000);
  if ((schedule.recurrence_type || 'weekly') === 'none') return weeks === 0;
  return schedule.recurrence_type !== 'biweekly' || weeks % 2 === 0;
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, school_code, query, date, record_id, student_id, class_id, schedule_id, status, excused_reason, attachment_file_url, attachment_file_name } = body;
    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();
    const caller = caller_username === admin.username && caller_password === admin.password ? { role: 'admin' } : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || !['admin', 'area', 'manager', 'school_admin'].includes(caller.role)) return Response.json({ success: false, error: 'School manager access is required.' }, { status: 403 });
    const targetSchool = school_code || caller.school_code;
    if (!targetSchool || (caller.role !== 'admin' && caller.role !== 'area' && caller.school_code !== targetSchool)) return Response.json({ success: false, error: 'Not authorized for this school.' }, { status: 403 });
    const classes = await base44.asServiceRole.entities.Class.filter({ school_code: targetSchool }, undefined, 500);
    const classIds = new Set(classes.map((item) => item.id));

    if (action === 'search') {
      if (!query?.trim() || !date) return Response.json({ success: true, records: [] });
      const term = query.trim().toLowerCase();
      const [students, memberships, schedules, attendance] = await Promise.all([
        base44.asServiceRole.entities.Student.filter({ school_code: targetSchool }, 'student_name', 500),
        base44.asServiceRole.entities.StudentClass.filter({ school_code: targetSchool }, undefined, 1000),
        base44.asServiceRole.entities.ClassSchedule.list(undefined, 1000),
        base44.asServiceRole.entities.AttendanceRecord.filter({ date }, undefined, 1000),
      ]);
      const matchingStudents = students.filter((item) => `${item.student_name} ${item.student_number || ''}`.toLowerCase().includes(term));
      const matchingClasses = classes.filter((item) => `${item.class_name} ${item.subject || ''}`.toLowerCase().includes(term));
      const studentIds = new Set(matchingStudents.map((item) => item.id));
      const searchedClassIds = new Set(matchingClasses.map((item) => item.id));
      const relevantMemberships = memberships.filter((item) => item.status !== 'withdrawn' && classIds.has(item.class_id) && (studentIds.has(item.student_id) || searchedClassIds.has(item.class_id)));
      const activeSchedules = schedules.filter((item) => classIds.has(item.class_id) && scheduleRunsOnDate(item, date));
      const scheduleByClass = new Map(); activeSchedules.forEach((item) => scheduleByClass.set(item.class_id, [...(scheduleByClass.get(item.class_id) || []), item]));
      const studentDetails = new Map(students.map((item) => [item.id, { name: item.student_name, has504: Boolean(item.section_504_plan), hasIep: Boolean(item.iep_on_file) }]));
      const classNames = new Map(classes.map((item) => [item.id, item.class_name]));
      const attendanceByKey = new Map(attendance.map((item) => [`${item.student_id}:${item.class_id}:${item.schedule_id}`, item]));
      const records = relevantMemberships.flatMap((membership) => (scheduleByClass.get(membership.class_id) || []).map((schedule) => {
        const existing = attendanceByKey.get(`${membership.student_id}:${membership.class_id}:${schedule.id}`);
        const student = studentDetails.get(membership.student_id) || {};
        return { ...(existing || {}), student_id: membership.student_id, student_name: student.name || 'Student', has_504: student.has504, has_iep: student.hasIep, class_id: membership.class_id, class_name: classNames.get(membership.class_id) || 'Class', schedule_id: schedule.id, date, start_time: schedule.start_time, end_time: schedule.end_time, status: existing?.status || 'not_taken', submitted: Boolean(existing?.submitted), locked_by_manager: Boolean(existing?.locked_by_manager) };
      })).sort((a, b) => `${a.student_name}${a.start_time}`.localeCompare(`${b.student_name}${b.start_time}`));
      return Response.json({ success: true, records });
    }

    if (action !== 'save' || !student_id || !class_id || !schedule_id || !date || !statuses.includes(status) || !classIds.has(class_id)) return Response.json({ success: false, error: 'Invalid attendance update.' }, { status: 400 });
    const existing = record_id ? await base44.asServiceRole.entities.AttendanceRecord.get(record_id) : (await base44.asServiceRole.entities.AttendanceRecord.filter({ student_id, class_id, schedule_id, date }, undefined, 1))[0];
    if (existing && !classIds.has(existing.class_id)) return Response.json({ success: false, error: 'Attendance record not found.' }, { status: 404 });
    const update = { status, excused_reason: status === 'excused' ? excused_reason || '' : '', attachment_file_url: status === 'excused' ? attachment_file_url || existing?.attachment_file_url || '' : '', attachment_file_name: status === 'excused' ? attachment_file_name || existing?.attachment_file_name || '' : '', submitted: true, locked_by_manager: status === 'excused' };
    const record = existing ? await base44.asServiceRole.entities.AttendanceRecord.update(existing.id, update) : await base44.asServiceRole.entities.AttendanceRecord.create({ student_id, class_id, schedule_id, date, ...update });
    return Response.json({ success: true, record });
  } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
}