import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const { username: adminUsername, password: adminPassword } = getAdminCredentials();
const fromAddress = 'hello@reportal360.blueridge-group.co.uk';

function clean(value) {
  return String(value || '').trim();
}

async function canContactStudent(base44, caller, studentId) {
  if (caller.role !== 'teacher') return true;
  const [assignments, enrollments, homerooms] = await Promise.all([
    base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: caller.id }, undefined, 500),
    base44.asServiceRole.entities.StudentClass.filter({ student_id: studentId, status: 'active' }, undefined, 500),
    base44.asServiceRole.entities.Homeroom.filter({ teacher_id: caller.id }, undefined, 50),
  ]);
  const classIds = new Set(assignments.map((item) => item.class_id));
  return enrollments.some((item) => classIds.has(item.class_id)) || homerooms.some((item) => (item.student_ids || []).includes(studentId));
}

async function sendEmail({ conversation, sender, body, replyTo, subject }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secrets.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${sender.full_name || sender.username} at ${sender.school_name || 'their school'} <${fromAddress}>`,
      to: conversation.parent_email,
      reply_to: replyTo,
      subject,
      text: `${body}\n\nReply directly to continue this conversation.`,
    }),
  });
  if (!response.ok) throw new Error('Email could not be sent. Confirm the sending domain is verified.');
  return await response.json();
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso } = body;
    const base44 = createClientFromRequest(req);
    let caller;
    if (caller_username === adminUsername && caller_password === adminPassword) caller = { id: 'admin', username: 'admin', full_name: 'Administrator', role: 'admin' };
    else caller = await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || !['teacher', 'manager', 'area', 'school_admin', 'admin'].includes(caller.role)) return Response.json({ success: false, error: 'Staff access required' }, { status: 403 });

    if (action === 'list') {
      const query = caller.role === 'teacher' ? { teacher_id: caller.id } : { school_code: caller.school_code };
      const conversations = await base44.asServiceRole.entities.ParentConversation.filter(query, '-last_message_at', 200);
      return Response.json({ success: true, conversations });
    }

    if (action === 'thread') {
      const conversation = await base44.asServiceRole.entities.ParentConversation.get(body.conversation_id);
      if (!conversation || (caller.role === 'teacher' && conversation.teacher_id !== caller.id) || (caller.role !== 'teacher' && caller.school_code && conversation.school_code !== caller.school_code)) return Response.json({ success: false, error: 'Conversation unavailable' }, { status: 403 });
      const messages = await base44.asServiceRole.entities.ParentEmailMessage.filter({ conversation_id: conversation.id }, 'sent_at', 200);
      if (conversation.unread_for_teacher) await base44.asServiceRole.entities.ParentConversation.update(conversation.id, { unread_for_teacher: false });
      return Response.json({ success: true, conversation: { ...conversation, unread_for_teacher: false }, messages });
    }

    if (action === 'start') {
      const { student_id, recipient_email, subject, message } = body;
      if (!student_id || !recipient_email || !clean(subject) || !clean(message)) return Response.json({ success: false, error: 'Recipient, subject, and message are required' }, { status: 400 });
      const student = await base44.asServiceRole.entities.Student.get(student_id);
      if (!student || (caller.school_code && caller.role !== 'admin' && student.school_code !== caller.school_code) || !(await canContactStudent(base44, caller, student_id))) return Response.json({ success: false, error: 'Not authorized for this student' }, { status: 403 });
      const contact = (student.emergency_contacts || []).find((item) => item.email?.toLowerCase() === recipient_email.toLowerCase());
      if (!contact) return Response.json({ success: false, error: 'Choose an email saved on the student profile' }, { status: 400 });
      const conversation = await base44.asServiceRole.entities.ParentConversation.create({ school_code: student.school_code, student_id, student_name: student.student_name, parent_email: recipient_email.toLowerCase(), parent_name: contact.name || '', teacher_id: caller.id, teacher_name: caller.full_name || caller.username, subject: clean(subject), last_message_at: new Date().toISOString(), last_message_preview: clean(message).slice(0, 160), unread_for_teacher: false, status: 'open' });
      const sent = await sendEmail({ conversation, sender: caller, body: clean(message), replyTo: fromAddress, subject: `[Ref: ${conversation.id}] ${clean(subject)}` });
      await base44.asServiceRole.entities.ParentEmailMessage.create({ conversation_id: conversation.id, direction: 'outbound', sender_name: caller.full_name || caller.username, sender_email: fromAddress, body: clean(message), sent_at: new Date().toISOString(), resend_email_id: sent.id || '' });
      return Response.json({ success: true, conversation });
    }

    if (action === 'reply') {
      const conversation = await base44.asServiceRole.entities.ParentConversation.get(body.conversation_id);
      const message = clean(body.message);
      if (!conversation || !message || (caller.role === 'teacher' && conversation.teacher_id !== caller.id)) return Response.json({ success: false, error: 'Conversation or message unavailable' }, { status: 403 });
      const now = new Date().toISOString();
      const replySubject = conversation.subject.startsWith('Re:') ? conversation.subject : `Re: ${conversation.subject}`;
      const sent = await sendEmail({ conversation, sender: caller, body: message, replyTo: fromAddress, subject: `[Ref: ${conversation.id}] ${replySubject}` });
      await base44.asServiceRole.entities.ParentEmailMessage.create({ conversation_id: conversation.id, direction: 'outbound', sender_name: caller.full_name || caller.username, sender_email: fromAddress, body: message, sent_at: now, resend_email_id: sent.id || '' });
      await base44.asServiceRole.entities.ParentConversation.update(conversation.id, { last_message_at: now, last_message_preview: message.slice(0, 160), unread_for_teacher: false, status: 'open' });
      return Response.json({ success: true });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}