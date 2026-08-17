import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { validatePasswordComplexity } from '../../shared/security.ts';

const normalize = (value) => (value || '').trim().toLowerCase();
const message = 'If the details match an account, we will send a recovery code to its registered email address.';

async function findAccount(base44, username) {
  const students = await base44.asServiceRole.entities.Student.filter({ username }, undefined, 1);
  if (students[0]) return { account: students[0], type: 'student' };
  const teachers = await base44.asServiceRole.entities.Teacher.filter({ username }, undefined, 1);
  return teachers[0] ? { account: teachers[0], type: 'teacher' } : null;
}

async function sendCode(email, code) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secrets.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: secrets.get('RESEND_FROM_EMAIL') || 'ReportAL 360 <onboarding@resend.dev>',
      to: email,
      subject: 'Your ReportAL 360 password reset code',
      html: `<p>Use this code to reset your ReportAL 360 password:</p><h1>${code}</h1><p>This code expires in 10 minutes.</p>`,
    }),
  });
  return response.ok;
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    if (body.action === 'request_password_reset') {
      const found = await findAccount(base44, body.username);
      if (!found || !found.account.email || normalize(found.account.email) !== normalize(body.email)) return Response.json({ success: true, message });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await base44.asServiceRole.entities.AccountRecovery.deleteMany({ username: found.account.username });
      await base44.asServiceRole.entities.AccountRecovery.create({ account_id: found.account.id, account_type: found.type, username: found.account.username, code, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
      await sendCode(found.account.email, code);
      return Response.json({ success: true, message });
    }
    if (body.action === 'complete_password_reset') {
      const found = await findAccount(base44, body.username);
      const resets = found ? await base44.asServiceRole.entities.AccountRecovery.filter({ username: body.username }, '-created_date', 1) : [];
      const reset = resets[0];
      const passwordError = validatePasswordComplexity(body.new_password || '');
      if (!found || !reset || reset.code !== body.code || new Date(reset.expires_at) < new Date() || passwordError) return Response.json({ success: false, error: passwordError || 'The recovery code is invalid or expired.' }, { status: 400 });
      const entity = found.type === 'student' ? base44.asServiceRole.entities.Student : base44.asServiceRole.entities.Teacher;
      await entity.update(found.account.id, { password: body.new_password, password_reset_required: false, failed_login_attempts: 0, locked_until: null });
      await base44.asServiceRole.entities.AccountRecovery.delete(reset.id);
      return Response.json({ success: true });
    }
    if (body.action === 'recover_student_username') {
      const students = await base44.asServiceRole.entities.Student.filter({ school_code: body.school_code?.trim() }, undefined, 500);
      const matches = students.filter((student) => normalize(student.student_name || `${student.first_name || ''} ${student.last_name || ''}`) === normalize(body.full_name) && String(student.grade_level || '') === String(body.grade_level || ''));
      return Response.json({ success: true, username: matches.length === 1 ? matches[0].username : null });
    }
    return Response.json({ success: false, error: 'Unknown recovery action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}