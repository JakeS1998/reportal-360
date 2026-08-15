import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';
import { getAdminCredentials } from '../../shared/security.ts';

const statuses = ['present', 'absent', 'late', 'excused'];

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, school_code, record_id, status, excused_reason } = body;
    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();
    const caller = caller_username === admin.username && caller_password === admin.password
      ? { role: 'admin' }
      : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || !['admin', 'area', 'manager', 'school_admin'].includes(caller.role)) return Response.json({ success: false, error: 'School manager access is required.' }, { status: 403 });
    const targetSchool = school_code || caller.school_code;
    if (!targetSchool || (caller.role !== 'admin' && caller.role !== 'area' && caller.school_code !== targetSchool)) return Response.json({ success: false, error: 'Not authorized for this school.' }, { status: 403 });

    const classes = await base44.asServiceRole.entities.Class.filter({ school_code: targetSchool }, undefined, 500);
    const classIds = new Set(classes.map((item) => item.id));
    if (action === 'list') {
      const [records, students] = await Promise.all([
        base44.asServiceRole.entities.AttendanceRecord.list('-date', 500),
        base44.asServiceRole.entities.Student.filter({ school_code: targetSchool }, 'student_name', 500),
      ]);
      const classNames = new Map(classes.map((item) => [item.id, item.class_name]));
      const studentNames = new Map(students.map((item) => [item.id, item.student_name]));
      return Response.json({ success: true, records: records.filter((item) => classIds.has(item.class_id)).map((item) => ({ ...item, class_name: classNames.get(item.class_id) || 'Class', student_name: studentNames.get(item.student_id) || 'Student' })) });
    }
    if (action !== 'update' || !record_id || !statuses.includes(status)) return Response.json({ success: false, error: 'Invalid attendance update.' }, { status: 400 });
    const record = await base44.asServiceRole.entities.AttendanceRecord.get(record_id);
    if (!record || !classIds.has(record.class_id)) return Response.json({ success: false, error: 'Attendance record not found.' }, { status: 404 });
    const update = status === 'excused'
      ? { status, excused_reason: excused_reason || '', submitted: true }
      : { status, excused_reason: '', attachment_file_url: '', attachment_file_name: '', submitted: true };
    const updated = await base44.asServiceRole.entities.AttendanceRecord.update(record_id, update);
    return Response.json({ success: true, record: updated });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}