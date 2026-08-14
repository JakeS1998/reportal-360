import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

async function getCaller(base44, body) {
  const admin = getAdminCredentials();
  if (body.caller_username === admin.username && body.caller_password === admin.password) return { role: 'admin', id: 'admin', full_name: 'Administrator' };
  const students = await base44.asServiceRole.entities.Student.filter({ username: body.caller_username, password: body.caller_password }, undefined, 1);
  if (students.length) {
    if (students[0].status !== 'active') return null;
    return { ...students[0], role: 'student', full_name: students[0].student_name };
  }
  return resolveStaffCaller(base44, { callerUsername: body.caller_username, callerPassword: body.caller_password, callerEmail: body.caller_email, callerSso: body.caller_sso });
}

export default async function(req) {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const caller = await getCaller(base44, body);
    if (!caller) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const service = base44.asServiceRole.entities;
    const manager = ['admin', 'manager', 'area', 'school_admin'].includes(caller.role);
    const canTeach = async (classId) => manager || (await service.TeacherClass.filter({ teacher_id: caller.id, class_id: classId }, undefined, 1)).length > 0;

    if (body.action === 'student_list') {
      if (caller.role !== 'student') return Response.json({ success: false, error: 'Student access required' }, { status: 403 });
      const enrollments = await service.StudentClass.filter({ student_id: caller.id, status: 'active' }, undefined, 500);
      const classIds = new Set(enrollments.map((item) => item.class_id));
      const assignments = (await service.Assignment.filter({ school_code: caller.school_code }, 'deadline', 500)).filter((item) => classIds.has(item.class_id));
      const submissions = await service.AssignmentSubmission.filter({ student_id: caller.id }, '-submitted_at', 500);
      return Response.json({ success: true, assignments, submissions });
    }

    if (body.action === 'teacher_list') {
      if (caller.role === 'student' || !(await canTeach(body.class_id))) return Response.json({ success: false, error: 'Not authorized for this class' }, { status: 403 });
      const assignments = await service.Assignment.filter({ class_id: body.class_id }, '-created_date', 500);
      const ids = new Set(assignments.map((item) => item.id));
      const submissions = (await service.AssignmentSubmission.list('-submitted_at', 500)).filter((item) => ids.has(item.assignment_id));
      return Response.json({ success: true, assignments, submissions });
    }

    if (body.action === 'teacher_all') {
      if (caller.role === 'student') return Response.json({ success: false, error: 'Teacher access required' }, { status: 403 });
      const assignments = await service.Assignment.filter({ teacher_id: caller.id }, '-created_date', 500);
      const ids = new Set(assignments.map((item) => item.id));
      const submissions = (await service.AssignmentSubmission.list('-submitted_at', 500)).filter((item) => ids.has(item.assignment_id));
      return Response.json({ success: true, assignments, submissions });
    }

    if (body.action === 'create') {
      const assignment = body.assignment || {};
      if (caller.role === 'student' || !assignment.class_id || !assignment.title || !assignment.deadline || !(await canTeach(assignment.class_id))) return Response.json({ success: false, error: 'A class, title, future deadline, and teacher access are required' }, { status: 403 });
      if (new Date(assignment.deadline).getTime() <= Date.now()) return Response.json({ success: false, error: 'Deadline must be in the future' }, { status: 400 });
      const created = await service.Assignment.create({ ...assignment, school_code: caller.school_code, teacher_id: caller.id, teacher_name: caller.full_name || caller.username, status: 'open' });
      return Response.json({ success: true, assignment: created });
    }

    if (body.action === 'submit') {
      if (caller.role !== 'student') return Response.json({ success: false, error: 'Student access required' }, { status: 403 });
      const assignment = await service.Assignment.get(body.assignment_id);
      if (!assignment || assignment.school_code !== caller.school_code || assignment.status !== 'open' || new Date(assignment.deadline).getTime() < Date.now()) return Response.json({ success: false, error: 'This assignment is no longer accepting submissions' }, { status: 403 });
      const enrolled = await service.StudentClass.filter({ student_id: caller.id, class_id: assignment.class_id, status: 'active' }, undefined, 1);
      if (!enrolled.length || !body.file_url) return Response.json({ success: false, error: 'Upload an assignment document' }, { status: 400 });
      const existing = await service.AssignmentSubmission.filter({ assignment_id: assignment.id, student_id: caller.id }, undefined, 1);
      const payload = {
        assignment_id: assignment.id, student_id: caller.id, student_name: caller.student_name,
        file_url: body.file_url, file_name: body.file_name || '',
        ai_report_file_url: assignment.enable_ai_plagiarism_report ? body.ai_report_file_url || '' : '',
        ai_report_file_name: assignment.enable_ai_plagiarism_report ? body.ai_report_file_name || '' : '',
        submission_text: '', submitted_at: new Date().toISOString(), teacher_viewed_by: [], status: 'submitted'
      };
      const submission = existing.length ? await service.AssignmentSubmission.update(existing[0].id, payload) : await service.AssignmentSubmission.create(payload);
      return Response.json({ success: true, submission });
    }

    if (body.action === 'grade_submission') {
      const submission = await service.AssignmentSubmission.get(body.submission_id);
      const assignment = submission && await service.Assignment.get(submission.assignment_id);
      const validLetters = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
      if (!submission || !assignment || caller.role === 'student' || !(await canTeach(assignment.class_id))) return Response.json({ success: false, error: 'Not authorized' }, { status: 403 });
      if (submission.grade_released) return Response.json({ success: false, error: 'Released grades cannot be changed' }, { status: 403 });
      if (!Number.isFinite(body.grade_percentage) || body.grade_percentage < 0 || body.grade_percentage > 100 || (body.letter_grade && !validLetters.includes(body.letter_grade))) return Response.json({ success: false, error: 'Enter a percentage from 0 to 100 and, if supplied, a valid letter grade' }, { status: 400 });
      const updated = await service.AssignmentSubmission.update(submission.id, { grade_percentage: body.grade_percentage, letter_grade: body.letter_grade || '', feedback: body.feedback || '', grade_released: false, grade_released_at: null });
      return Response.json({ success: true, submission: updated });
    }

    if (body.action === 'release_grades') {
      const assignment = await service.Assignment.get(body.assignment_id);
      if (!assignment || caller.role === 'student' || !(await canTeach(assignment.class_id))) return Response.json({ success: false, error: 'Not authorized' }, { status: 403 });
      const submissions = await service.AssignmentSubmission.filter({ assignment_id: assignment.id }, undefined, 500);
      const graded = submissions.filter((item) => Number.isFinite(item.grade_percentage));
      await Promise.all(graded.map((item) => service.AssignmentSubmission.update(item.id, { grade_released: true, grade_released_at: new Date().toISOString() })));
      return Response.json({ success: true, released: graded.length });
    }

    if (body.action === 'view_submission') {
      const submission = await service.AssignmentSubmission.get(body.submission_id);
      const assignment = submission && await service.Assignment.get(submission.assignment_id);
      if (!submission || !assignment || caller.role === 'student' || !(await canTeach(assignment.class_id))) return Response.json({ success: false, error: 'Not authorized' }, { status: 403 });
      const viewers = submission.teacher_viewed_by || [];
      if (!viewers.some((item) => item.teacher_id === caller.id)) viewers.push({ teacher_id: caller.id, teacher_name: caller.full_name || caller.username, viewed_at: new Date().toISOString() });
      const updated = await service.AssignmentSubmission.update(submission.id, { teacher_viewed_by: viewers, status: 'viewed' });
      return Response.json({ success: true, submission: updated });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}