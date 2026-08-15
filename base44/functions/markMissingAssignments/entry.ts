import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole.entities;
    const assignments = await service.Assignment.filter({ status: 'open' }, 'deadline', 500);
    const overdue = assignments.filter((assignment) => new Date(assignment.deadline).getTime() < Date.now());
    let markedMissing = 0;
    for (const assignment of overdue) {
      const [enrollments, submissions] = await Promise.all([
        service.StudentClass.filter({ class_id: assignment.class_id, status: 'active' }, undefined, 500),
        service.AssignmentSubmission.filter({ assignment_id: assignment.id }, undefined, 500),
      ]);
      const submittedStudentIds = new Set(submissions.map((submission) => submission.student_id));
      const missing = enrollments.filter((enrollment) => !submittedStudentIds.has(enrollment.student_id)).map((enrollment) => ({
        assignment_id: assignment.id, student_id: enrollment.student_id, student_name: enrollment.student_name || '',
        submitted_at: assignment.deadline, teacher_viewed_by: [], status: 'missing', grade_released: false,
      }));
      if (missing.length) {
        await service.AssignmentSubmission.bulkCreate(missing);
        markedMissing += missing.length;
      }
    }
    return Response.json({ success: true, marked_missing: markedMissing });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}