import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const admin = getAdminCredentials();
    const caller = caller_username === admin.username && caller_password === admin.password
      ? { id: 'admin', full_name: 'Administrator', role: 'admin', school_code: params.school_code }
      : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || caller.active === false) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const schoolCode = params.school_code || caller.school_code;
    if (!schoolCode || (caller.role !== 'admin' && caller.school_code !== schoolCode)) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const credentials = { id: caller.id, name: caller.full_name || caller.username || 'Staff member' };
    if (action === 'inbox') {
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ recipient_id: caller.id, school_code: schoolCode }, '-created_date', 200);
      return Response.json({ success: true, messages });
    }
    if (action === 'staff') {
      const staff = await base44.asServiceRole.entities.Teacher.filter({ school_code: schoolCode, active: { $ne: false } }, 'full_name', 500);
      return Response.json({ success: true, staff: staff.map((person) => ({ id: person.id, full_name: person.full_name, role: person.role })) });
    }
    if (action === 'send') {
      const recipient = await base44.asServiceRole.entities.Teacher.get(params.recipient_id);
      if (!recipient || recipient.school_code !== schoolCode || !params.content?.trim()) return Response.json({ success: false, error: 'Choose a recipient and enter a message' }, { status: 400 });
      const message = await base44.asServiceRole.entities.StaffMessage.create({ school_code: schoolCode, sender_id: credentials.id, sender_name: credentials.name, recipient_id: recipient.id, recipient_name: recipient.full_name || '', type: 'message', content: params.content.trim() });
      return Response.json({ success: true, message });
    }
    if (action === 'alert') {
      if (!['admin', 'manager', 'area', 'school_admin'].includes(caller.role)) return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
      if (!params.title?.trim() || !params.content?.trim()) return Response.json({ success: false, error: 'An alert title and message are required' }, { status: 400 });
      const staff = await base44.asServiceRole.entities.Teacher.filter({ school_code: schoolCode, active: { $ne: false } }, 'full_name', 500);
      const recipients = params.recipient_ids?.length ? staff.filter((person) => params.recipient_ids.includes(person.id)) : staff.filter((person) => person.role === 'teacher');
      await base44.asServiceRole.entities.StaffMessage.bulkCreate(recipients.map((person) => ({ school_code: schoolCode, sender_id: credentials.id, sender_name: credentials.name, recipient_id: person.id, recipient_name: person.full_name || '', type: 'alert', title: params.title.trim(), content: params.content.trim() })));
      return Response.json({ success: true, count: recipients.length });
    }
    if (action === 'read') {
      const message = await base44.asServiceRole.entities.StaffMessage.get(params.message_id);
      if (!message || message.recipient_id !== caller.id) return Response.json({ success: false, error: 'Message unavailable' }, { status: 404 });
      await base44.asServiceRole.entities.StaffMessage.update(message.id, { read_at: new Date().toISOString() });
      return Response.json({ success: true });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
}