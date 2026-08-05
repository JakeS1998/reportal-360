import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { action, system_code, school_code, teacher_id, teacher } = body;

    if (!system_code || !school_code) {
      return Response.json(
        { success: false, error: "system_code and school_code are required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Verify a school_admin exists for this school
    const admins = await base44.asServiceRole.entities.Teacher.filter({
      system_code,
      school_code,
      role: "school_admin",
    });
    if (admins.length === 0) {
      return Response.json(
        { success: false, error: "No school administrator assigned to this school" },
        { status: 403 }
      );
    }

    if (action === "create") {
      if (!teacher || !teacher.username || !teacher.password) {
        return Response.json(
          { success: false, error: "username and password are required" },
          { status: 400 }
        );
      }
      const created = await base44.asServiceRole.entities.Teacher.create({
        username: teacher.username,
        password: teacher.password,
        full_name: teacher.full_name || "",
        email: teacher.email || "",
        role: teacher.role === "school_admin" ? "school_admin" : "teacher",
        school_code,
        system_code,
        school_name: admins[0].school_name || "",
      });
      return Response.json({ success: true, teacher: created });
    }

    if (action === "delete") {
      if (!teacher_id) {
        return Response.json(
          { success: false, error: "teacher_id is required" },
          { status: 400 }
        );
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(teacher_id);
      if (!existing || existing.system_code !== system_code || existing.school_code !== school_code) {
        return Response.json(
          { success: false, error: "Teacher not found at this school" },
          { status: 404 }
        );
      }
      await base44.asServiceRole.entities.Teacher.delete(teacher_id);
      return Response.json({ success: true });
    }

    if (action === "list") {
      const list = await base44.asServiceRole.entities.Teacher.filter({
        system_code,
        school_code,
      });
      return Response.json({ success: true, teachers: list });
    }

    return Response.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}