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
      ? { id: 'admin', full_name: 'Administrator', role: 'admin' }
      : await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller || caller.active === false) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    const schoolCode = params.school_code || params.syllabus?.school_code;
    const manager = ['admin', 'manager', 'area', 'school_admin'].includes(caller.role);
    if (!schoolCode || (!manager && caller.school_code !== schoolCode)) return Response.json({ success: false, error: 'Not authorized for this school' }, { status: 403 });
    const canAuthorClass = async (classId) => manager || (await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: caller.id, class_id: classId }, undefined, 1)).length > 0;

    if (action === 'list') {
      const [classes, syllabuses] = await Promise.all([
        base44.asServiceRole.entities.Class.filter({ school_code: schoolCode, status: 'active' }, 'class_name', 500),
        base44.asServiceRole.entities.Syllabus.filter({ school_code: schoolCode }, '-updated_date', 500),
      ]);
      if (manager) return Response.json({ success: true, classes, syllabuses });
      const assignments = await base44.asServiceRole.entities.TeacherClass.filter({ teacher_id: caller.id, school_code: schoolCode }, undefined, 500);
      const classIds = new Set(assignments.map((item) => item.class_id));
      return Response.json({ success: true, classes: classes.filter((item) => classIds.has(item.id)), syllabuses: syllabuses.filter((item) => item.owner_id === caller.id || classIds.has(item.class_id)) });
    }

    if (action === 'save') {
      const syllabus = params.syllabus || {};
      if (!syllabus.class_id || !syllabus.title) return Response.json({ success: false, error: 'Class and title are required' }, { status: 400 });
      if (!(await canAuthorClass(syllabus.class_id))) return Response.json({ success: false, error: 'Not assigned to this class' }, { status: 403 });
      const { id, owner_id, owner_name, ...content } = syllabus;
      if (id) {
        const existing = await base44.asServiceRole.entities.Syllabus.get(id);
        if (!existing || existing.school_code !== schoolCode || (!manager && existing.owner_id !== caller.id)) return Response.json({ success: false, error: 'Syllabus unavailable' }, { status: 403 });
        return Response.json({ success: true, syllabus: await base44.asServiceRole.entities.Syllabus.update(id, content) });
      }
      return Response.json({ success: true, syllabus: await base44.asServiceRole.entities.Syllabus.create({ ...content, school_code: schoolCode, owner_id: caller.id, owner_name: caller.full_name || caller.username || 'Teacher' }) });
    }
    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}