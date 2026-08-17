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
    if (action === 'threads') {
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ school_code: schoolCode, type: 'message' }, '-created_date', 500);
      const relevant = messages.filter((message) => message.sender_id === caller.id || message.recipient_id === caller.id);
      const seenPeople = new Set();
      const threads = relevant.filter((message) => {
        const personId = message.sender_id === caller.id ? message.recipient_id : message.sender_id;
        if (seenPeople.has(personId)) return false;
        seenPeople.add(personId);
        return true;
      }).map((message) => {
        const personId = message.sender_id === caller.id ? message.recipient_id : message.sender_id;
        const personName = message.sender_id === caller.id ? message.recipient_name : message.sender_name;
        return { person_id: personId, person_name: personName, content: message.content, unread: relevant.filter((item) => item.sender_id === personId && item.recipient_id === caller.id && !item.read_at).length, created_date: message.created_date };
      });
      return Response.json({ success: true, threads });
    }
    if (action === 'thread') {
      const recipient = await base44.asServiceRole.entities.Teacher.get(params.recipient_id);
      if (!recipient || recipient.school_code !== schoolCode) return Response.json({ success: false, error: 'Conversation unavailable' }, { status: 404 });
      const allMessages = await base44.asServiceRole.entities.StaffMessage.filter({ school_code: schoolCode, type: 'message' }, 'created_date', 500);
      const messages = allMessages.filter((message) => (message.sender_id === caller.id && message.recipient_id === recipient.id) || (message.sender_id === recipient.id && message.recipient_id === caller.id));
      const unread = messages.filter((message) => message.sender_id === recipient.id && message.recipient_id === caller.id && !message.read_at).map((message) => ({ id: message.id, read_at: new Date().toISOString() }));
      if (unread.length) await base44.asServiceRole.entities.StaffMessage.bulkUpdate(unread);
      return Response.json({ success: true, messages });
    }
    if (action === 'staff') {
      const staff = await base44.asServiceRole.entities.Teacher.filter({ school_code: schoolCode, active: { $ne: false } }, 'full_name', 500);
      return Response.json({ success: true, staff: staff.map((person) => ({ id: person.id, full_name: person.full_name, role: person.role })) });
    }
    if (action === 'support_thread') {
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ school_code: schoolCode }, 'created_date', 500);
      return Response.json({ success: true, messages: messages.filter((message) => message.thread_id?.startsWith('support:') && (message.sender_id === caller.id || message.recipient_id === caller.id)) });
    }
    if (action === 'support_request') {
      if (!params.content?.trim()) return Response.json({ success: false, error: 'Describe the issue before sending your request' }, { status: 400 });
      const administrators = (await base44.asServiceRole.entities.Teacher.filter({ active: { $ne: false } }, 'full_name', 5000)).filter((person) => person.role === 'admin');
      const tickets = await base44.asServiceRole.entities.StaffMessage.filter({ type: 'alert' }, 'created_date', 5000);
      const workload = administrators.reduce((counts, person) => ({ ...counts, [person.id]: tickets.filter((ticket) => ticket.thread_id?.startsWith('support:') && ticket.assigned_admin_id === person.id && !['resolved', 'closed'].includes(ticket.ticket_status)).length }), {});
      const assignee = administrators.length ? [...administrators].sort((a, b) => (workload[a.id] || 0) - (workload[b.id] || 0) || a.full_name.localeCompare(b.full_name))[0] : { id: 'admin', full_name: 'Administrator' };
      const client = caller.system_code ? (await base44.asServiceRole.entities.Client.filter({ system_code: caller.system_code }, 'created_date', 1))[0] : null;
      const slaHours = client?.support_sla_hours || 24;
      const supportThreadId = `support:${caller.id}:${Date.now()}`;
      const currentPath = typeof params.current_path === 'string' ? params.current_path.slice(0, 500) : '';
      const ticket = await base44.asServiceRole.entities.StaffMessage.create({ school_code: schoolCode, thread_id: supportThreadId, sender_id: caller.id, sender_name: credentials.name, recipient_id: assignee.id, recipient_name: assignee.full_name || 'Administrator', assigned_admin_id: assignee.id, assigned_admin_name: assignee.full_name || 'Administrator', assigned_at: new Date().toISOString(), ticket_status: 'new', sla_due_at: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(), type: 'alert', title: 'Support request', content: params.content.trim(), current_path: currentPath });
      return Response.json({ success: true, ticket });
    }
    if (action === 'support_inbox') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ type: 'alert' }, 'created_date', 5000);
      const requests = messages.filter((message) => message.thread_id?.startsWith('support:'));
      const administrators = (await base44.asServiceRole.entities.Teacher.filter({ active: { $ne: false } }, 'full_name', 5000)).filter((person) => person.role === 'admin').map((person) => ({ id: person.id, full_name: person.full_name, expertise: [person.department, person.subject, ...(person.subjects || [])].filter(Boolean).join(', ') || 'General support', workload: requests.filter((ticket) => ticket.assigned_admin_id === person.id && !['resolved', 'closed'].includes(ticket.ticket_status)).length }));
      return Response.json({ success: true, requests, administrators });
    }
    if (action === 'reassign_support_request') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      const assignee = await base44.asServiceRole.entities.Teacher.get(params.admin_id);
      if (!request?.thread_id?.startsWith('support:') || assignee?.role !== 'admin' || assignee.active === false) return Response.json({ success: false, error: 'Choose an active administrator for this support ticket' }, { status: 400 });
      await base44.asServiceRole.entities.StaffMessage.update(request.id, { recipient_id: assignee.id, recipient_name: assignee.full_name || 'Administrator', assigned_admin_id: assignee.id, assigned_admin_name: assignee.full_name || 'Administrator', assigned_at: new Date().toISOString(), ticket_status: 'new' });
      return Response.json({ success: true });
    }
    if (action === 'update_support_status') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const statuses = ['new', 'awaiting_response', 'awaiting_customer', 'dormant', 'resolved', 'closed'];
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      if (!request?.thread_id?.startsWith('support:') || !statuses.includes(params.ticket_status)) return Response.json({ success: false, error: 'Choose a valid support ticket status' }, { status: 400 });
      await base44.asServiceRole.entities.StaffMessage.update(request.id, { ticket_status: params.ticket_status });
      return Response.json({ success: true });
    }
    if (action === 'support_request_detail') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      if (!request || !request.thread_id?.startsWith('support:')) return Response.json({ success: false, error: 'Support request unavailable' }, { status: 404 });
      const teacher = await base44.asServiceRole.entities.Teacher.get(request.sender_id);
      if (!teacher) return Response.json({ success: false, error: 'Teacher unavailable' }, { status: 404 });
      const schedule = await base44.asServiceRole.entities.ClassSchedule.filter({ school_code: request.school_code }, 'day_of_week', 5000);
      const teacherKeys = [teacher.id, teacher.teacher_id].filter(Boolean);
      return Response.json({ success: true, request, teacher: { id: teacher.id, full_name: teacher.full_name, email: teacher.email, school_code: teacher.school_code }, schedule: schedule.filter((slot) => teacherKeys.includes(slot.teacher_id)) });
    }
    if (action === 'support_reply') {
      if (caller.role !== 'admin' || !params.content?.trim()) return Response.json({ success: false, error: 'Administrator access and a reply are required' }, { status: 400 });
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      if (!request || !request.thread_id?.startsWith('support:')) return Response.json({ success: false, error: 'Support request unavailable' }, { status: 404 });
      const message = await base44.asServiceRole.entities.StaffMessage.create({ school_code: request.school_code, thread_id: request.thread_id, sender_id: credentials.id, sender_name: credentials.name, recipient_id: request.sender_id, recipient_name: request.sender_name || 'Teacher', type: 'message', content: params.content.trim() });
      return Response.json({ success: true, message });
    }
    if (action === 'outlook_connection') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      await base44.asServiceRole.connectors.getCurrentAppUserConnection('6a8315682b9286e588aab2e1');
      return Response.json({ success: true });
    }
    if (action === 'create_support_meeting') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      const startDateTime = new Date(params.start_at);
      const endDateTime = new Date(params.end_at);
      if (!request || !request.thread_id?.startsWith('support:') || Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) return Response.json({ success: false, error: 'Choose a valid support request and meeting time' }, { status: 400 });
      const teacher = await base44.asServiceRole.entities.Teacher.get(request.sender_id);
      if (!teacher?.email) return Response.json({ success: false, error: 'The teacher needs a school email address before a meeting can be created' }, { status: 400 });
      const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection('6a8315682b9286e588aab2e1');
      const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers });
      const profile = profileResponse.ok ? await profileResponse.json() : {};
      const graphDate = (value) => value.toISOString().replace(/\.\d{3}Z$/, '');
      const eventResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', { method: 'POST', headers, body: JSON.stringify({ subject: `ReportAL 360 support: ${teacher.full_name}`, body: { contentType: 'HTML', content: `<p>Support session for ${teacher.full_name}.</p>` }, start: { dateTime: graphDate(startDateTime), timeZone: 'UTC' }, end: { dateTime: graphDate(endDateTime), timeZone: 'UTC' }, attendees: [{ emailAddress: { address: teacher.email, name: teacher.full_name }, type: 'required' }], isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness', transactionId: `support-${request.id}-${startDateTime.getTime()}` }) });
      const event = await eventResponse.json();
      if (!eventResponse.ok) return Response.json({ success: false, error: event.error?.message || 'Outlook could not create the calendar appointment' }, { status: 502 });
      const meetingUrl = event.onlineMeeting?.joinUrl || event.webLink || '';
      const dayOfWeek = startDateTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      await base44.asServiceRole.entities.ClassSchedule.create({ class_id: `support-${request.id}-${startDateTime.getTime()}`, class_name: 'ReportAL 360 Support Call', school_code: request.school_code, day_of_week: dayOfWeek, start_time: startDateTime.toISOString().slice(11, 16), end_time: endDateTime.toISOString().slice(11, 16), teacher_id: teacher.id, teacher_name: teacher.full_name || 'Teacher', recurrence_type: 'none', recurrence_weeks: 1, start_date: startDateTime.toISOString().slice(0, 10), locked: true });
      if (profile.mail || profile.userPrincipalName) await fetch('https://graph.microsoft.com/v1.0/me/sendMail', { method: 'POST', headers, body: JSON.stringify({ message: { subject: `ReportAL 360 support appointment: ${teacher.full_name}`, body: { contentType: 'HTML', content: `<p>Your support appointment is booked for ${startDateTime.toLocaleString()}.</p><p><a href="${meetingUrl}">Open the calendar appointment</a></p>` }, toRecipients: [{ emailAddress: { address: profile.mail || profile.userPrincipalName } }] }, saveToSentItems: true }) });
      await base44.asServiceRole.entities.StaffMessage.create({ school_code: request.school_code, thread_id: request.thread_id, sender_id: credentials.id, sender_name: credentials.name, recipient_id: request.sender_id, recipient_name: teacher.full_name || 'Teacher', type: 'message', content: `A support appointment has been added to your schedule for ${startDateTime.toLocaleString()}. Outlook has emailed you the invitation.${meetingUrl ? ` Join here: ${meetingUrl}` : ''}` });
      return Response.json({ success: true, meeting_url: meetingUrl });
    }
    if (action === 'send') {
      const recipient = await base44.asServiceRole.entities.Teacher.get(params.recipient_id);
      if (!recipient || recipient.school_code !== schoolCode || !params.content?.trim()) return Response.json({ success: false, error: 'Choose a recipient and enter a message' }, { status: 400 });
      const threadId = [credentials.id, recipient.id].sort().join(':');
      const message = await base44.asServiceRole.entities.StaffMessage.create({ school_code: schoolCode, thread_id: threadId, sender_id: credentials.id, sender_name: credentials.name, recipient_id: recipient.id, recipient_name: recipient.full_name || '', type: 'message', content: params.content.trim() });
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