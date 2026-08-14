import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action, token, file_url, file_name, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const base44 = createClientFromRequest(req);
    if (action === 'get' || action === 'upload') {
      const request = (await base44.asServiceRole.entities.AttendancePhotoRequest.filter({ token }, undefined, 1))[0];
      if (!request || new Date(request.expires_at) < new Date()) return Response.json({ success: false, error: 'This photo link has expired' }, { status: 410 });
      if (action === 'get') return Response.json({ success: true, status: request.status, file_url: request.file_url, file_name: request.file_name });
      if (!file_url) return Response.json({ success: false, error: 'A photo is required' }, { status: 400 });
      const match = await base44.asServiceRole.entities.AttendanceRecord.filter({ student_id: request.student_id, class_id: request.class_id, schedule_id: request.schedule_id, date: request.date }, undefined, 1);
      const record = { status: 'excused', excused_reason: request.excused_reason || '', attachment_file_url: file_url, attachment_file_name: file_name || 'Attendance evidence' };
      if (match[0]) await base44.asServiceRole.entities.AttendanceRecord.update(match[0].id, record);
      else await base44.asServiceRole.entities.AttendanceRecord.create({ student_id: request.student_id, class_id: request.class_id, schedule_id: request.schedule_id, date: request.date, submitted: false, ...record });
      await base44.asServiceRole.entities.AttendancePhotoRequest.update(request.id, { status: 'uploaded', file_url, file_name: file_name || 'Attendance evidence' });
      return Response.json({ success: true });
    }
    const caller = await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    if (action !== 'create') return Response.json({ success: false, error: 'Not authorized' }, { status: 403 });
    const targetClass = (await base44.asServiceRole.entities.Class.filter({ id: params.class_id }, undefined, 1))[0];
    if (!targetClass || targetClass.school_code !== caller.school_code) return Response.json({ success: false, error: 'Not authorized for this class' }, { status: 403 });
    const tokenValue = crypto.randomUUID();
    const request = await base44.asServiceRole.entities.AttendancePhotoRequest.create({ token: tokenValue, student_id: params.student_id, class_id: params.class_id, schedule_id: params.schedule_id, date: params.date, excused_reason: params.excused_reason || '', status: 'pending', expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    return Response.json({ success: true, token: request.token });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}