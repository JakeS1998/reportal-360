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
      const school = (await base44.asServiceRole.entities.School.filter({ school_code: schoolCode }, 'created_date', 1))[0];
      const systemCode = caller.system_code || school?.system_code || '';
      const client = systemCode ? (await base44.asServiceRole.entities.Client.filter({ system_code: systemCode }, 'created_date', 1))[0] : null;
      const slaHours = client?.support_sla_hours || 24;
      const supportThreadId = `support:${caller.id}:${Date.now()}`;
      const currentPath = typeof params.current_path === 'string' ? params.current_path.slice(0, 500) : '';
      const now = new Date().toISOString();
      const ticket = await base44.asServiceRole.entities.StaffMessage.create({ school_code: schoolCode, system_code: systemCode, thread_id: supportThreadId, sender_id: caller.id, sender_name: credentials.name, recipient_id: assignee.id, recipient_name: assignee.full_name || 'Administrator', assigned_admin_id: assignee.id, assigned_admin_name: assignee.full_name || 'Administrator', assigned_at: now, ticket_status: 'new', sla_due_at: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(), last_response_at: now, type: 'alert', title: 'Support request', content: params.content.trim(), current_path: currentPath });
      return Response.json({ success: true, ticket });
    }
    if (action === 'support_inbox') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const messages = await base44.asServiceRole.entities.StaffMessage.filter({ type: 'alert' }, 'created_date', 5000);
      const staff = await base44.asServiceRole.entities.Teacher.filter({ active: { $ne: false } }, 'full_name', 5000);
      const schools = await base44.asServiceRole.entities.School.filter({}, 'created_date', 5000);
      const clients = await base44.asServiceRole.entities.Client.filter({}, 'created_date', 5000);
      const uniqueThreads = new Set();
      const requests = messages.filter((message) => {
        if (!message.thread_id?.startsWith('support:') || uniqueThreads.has(message.thread_id)) return false;
        uniqueThreads.add(message.thread_id);
        return true;
      });
      const administrators = staff.filter((person) => person.role === 'admin');
      const workload = administrators.reduce((counts, person) => ({ ...counts, [person.id]: requests.filter((ticket) => ticket.assigned_admin_id === person.id && !['resolved', 'closed'].includes(ticket.ticket_status)).length }), {});
      const updates = [];
      const tickets = requests.map((ticket) => {
        const sender = staff.find((person) => person.id === ticket.sender_id);
        const school = schools.find((item) => item.school_code === ticket.school_code);
        const systemCode = ticket.system_code || sender?.system_code || school?.system_code || '';
        const client = clients.find((item) => item.system_code === systemCode);
        const changes = { system_code: systemCode, ticket_status: ticket.ticket_status === 'open' || !ticket.ticket_status ? 'new' : ticket.ticket_status };
        if (!ticket.assigned_admin_id && administrators.length) {
          const assignee = [...administrators].sort((a, b) => (workload[a.id] || 0) - (workload[b.id] || 0) || a.full_name.localeCompare(b.full_name))[0];
          changes.recipient_id = assignee.id;
          changes.recipient_name = assignee.full_name || 'Administrator';
          changes.assigned_admin_id = assignee.id;
          changes.assigned_admin_name = assignee.full_name || 'Administrator';
          changes.assigned_at = new Date().toISOString();
          workload[assignee.id] = (workload[assignee.id] || 0) + 1;
        }
        if (!ticket.sla_due_at) changes.sla_due_at = new Date(new Date(ticket.created_date).getTime() + (client?.support_sla_hours || 24) * 60 * 60 * 1000).toISOString();
        const changed = Object.keys(changes).some((key) => changes[key] !== ticket[key]);
        if (changed) updates.push({ id: ticket.id, ...changes });
        return { ...ticket, ...changes };
      });
      if (updates.length) await base44.asServiceRole.entities.StaffMessage.bulkUpdate(updates);
      const administratorList = administrators.map((person) => ({ id: person.id, full_name: person.full_name, expertise: [person.department, person.subject, ...(person.subjects || [])].filter(Boolean).join(', ') || 'General support', workload: workload[person.id] || 0 }));
      return Response.json({ success: true, requests: tickets, administrators: administratorList });
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
      const updates = ['resolved', 'closed'].includes(params.ticket_status) ? { ticket_status: params.ticket_status, sla_due_at: null } : { ticket_status: params.ticket_status };
      await base44.asServiceRole.entities.StaffMessage.update(request.id, updates);
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
      const client = request.system_code ? (await base44.asServiceRole.entities.Client.filter({ system_code: request.system_code }, 'created_date', 1))[0] : null;
      const now = new Date();
      const message = await base44.asServiceRole.entities.StaffMessage.create({ school_code: request.school_code, thread_id: request.thread_id, sender_id: credentials.id, sender_name: credentials.name, recipient_id: request.sender_id, recipient_name: request.sender_name || 'Teacher', type: 'message', content: params.content.trim() });
      await base44.asServiceRole.entities.StaffMessage.update(request.id, { ticket_status: 'awaiting_customer', last_response_at: now.toISOString(), sla_due_at: new Date(now.getTime() + (client?.support_sla_hours || 24) * 60 * 60 * 1000).toISOString() });
      return Response.json({ success: true, message });
    }
    if (action === 'add_support_call') {
      if (caller.role !== 'admin') return Response.json({ success: false, error: 'Administrator access required' }, { status: 403 });
      const request = await base44.asServiceRole.entities.StaffMessage.get(params.request_id);
      const startAt = typeof params.start_at === 'string' ? params.start_at : '';
      const meetingUrl = typeof params.meeting_url === 'string' ? params.meeting_url.trim() : '';
      if (!request?.thread_id?.startsWith('support:') || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startAt) || !/^https?:\/\//.test(meetingUrl)) return Response.json({ success: false, error: 'Choose a valid time and paste a valid Teams link' }, { status: 400 });
      const teacher = await base44.asServiceRole.entities.Teacher.get(request.sender_id);
      if (!teacher) return Response.json({ success: false, error: 'Teacher unavailable' }, { status: 404 });
      const [date, startTime] = startAt.split('T');
      const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
      const endMinutes = startMinutes + 30;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      const dayOfWeek = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      await base44.asServiceRole.entities.ClassSchedule.create({ class_id: `support-${request.id}-${Date.now()}`, class_name: 'ReportAL 360 Support Call', school_code: request.school_code, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, teacher_id: teacher.id, teacher_name: teacher.full_name || 'Teacher', meeting_url: meetingUrl, recurrence_type: 'none', recurrence_weeks: 1, start_date: date, locked: true });
      await base44.asServiceRole.entities.StaffMessage.create({ school_code: request.school_code, thread_id: request.thread_id, sender_id: credentials.id, sender_name: credentials.name, recipient_id: request.sender_id, recipient_name: teacher.full_name || 'Teacher', type: 'message', content: `A Teams support call has been added to your schedule for ${date} at ${startTime}. Join here: ${meetingUrl}` });
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