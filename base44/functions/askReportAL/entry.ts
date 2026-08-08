import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials } from '../../shared/security.ts';
import { buildReportAnalytics } from '../../shared/reportAnalytics.ts';

export default async function(req) {
  try {
    const { question, school_code, caller_username, caller_password } = await req.json();
    const base44 = createClientFromRequest(req);
    const admin = getAdminCredentials();
    let authorised = caller_username === admin.username && caller_password === admin.password;
    let caller = null;
    if (!authorised && caller_username) {
      caller = (await base44.asServiceRole.entities.Teacher.filter({ username: caller_username, password: caller_password }, undefined, 1))[0];
      authorised = !!caller && ["manager", "area"].includes(caller.role);
      if (authorised && caller.role === "manager" && caller.school_code !== school_code) authorised = false;
      if (authorised && caller.role === "area") {
        const directory = await base44.asServiceRole.entities.SchoolDirectory.filter({ school_code }, undefined, 1);
        authorised = directory[0]?.system_code === caller.system_code;
      }
    }
    if (!authorised) return Response.json({ success: false, error: "Administrator access is required." }, { status: 403 });
    if (!question || !school_code) return Response.json({ success: false, error: "Question and school are required." }, { status: 400 });
    const analytics = await buildReportAnalytics(base44, { school_code });
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