import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { buildReportAnalytics } from '../../shared/reportAnalytics.ts';

export default async function(req) {
  try {
    const { question, school_code, caller_username, caller_password, caller_email, caller_sso } = await req.json();
    const base44 = createClientFromRequest(req);
    if (!question || !school_code) return Response.json({ success: false, error: "Question and school are required." }, { status: 400 });
    const admin = getAdminCredentials();
    const isAdmin = caller_username === admin.username && caller_password === admin.password;
    const caller = isAdmin ? null : caller_password
      ? (await base44.asServiceRole.entities.Teacher.filter({ username: caller_username, password: caller_password }, undefined, 1))[0]
      : caller_sso && caller_email
        ? (await base44.asServiceRole.entities.Teacher.filter({ username: caller_username, email: caller_email }, undefined, 1))[0]
        : null;
    if (!isAdmin && !caller) return Response.json({ success: false, error: "Your session could not be verified." }, { status: 403 });

    let classIds;
    if (!isAdmin) {
      if (caller.role === "manager" && caller.school_code !== school_code) return Response.json({ success: false, error: "You can only access your own school data." }, { status: 403 });
      if (caller.role === "area") {
        const directory = await base44.asServiceRole.entities.SchoolDirectory.filter({ school_code }, undefined, 1);
        if (directory[0]?.system_code !== caller.system_code) return Response.json({ success: false, error: "You can only access schools in your assigned system." }, { status: 403 });
      }
      if (caller.role === "teacher") {
        if (caller.school_code !== school_code) return Response.json({ success: false, error: "You can only access your own school data." }, { status: 403 });
        const assignments = await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: caller.teacher_id, school_code }, undefined, 500);
        classIds = assignments.map((assignment) => assignment.class_id);
      }
      if (!["teacher", "manager", "area"].includes(caller.role)) return Response.json({ success: false, error: "Your role does not have access to school analytics." }, { status: 403 });
    }
    const analytics = await buildReportAnalytics(base44, { school_code, class_ids: classIds });
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are ReportAL's education data analyst. Answer only from the authorised data below. Be concise, explain limitations, and never invent facts. Cite evidence using the exact source labels in a final 'Data sources' line. Question: ${question}\n\nAuthorised data: ${JSON.stringify(analytics)}`,
      model: "claude_sonnet_4_6",
      response_json_schema: { type: "object", properties: { answer: { type: "string" }, referenced_student_ids: { type: "array", items: { type: "string" } }, caveat: { type: "string" } }, required: ["answer"] }
    });
    const citedStudents = analytics.students.filter((student) => (result.referenced_student_ids || []).includes(student.student_id));
    return Response.json({ success: true, answer: result.answer, caveat: result.caveat || "", sources: analytics.sources, evidence: citedStudents });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}