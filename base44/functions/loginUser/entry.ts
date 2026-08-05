import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_SYSTEM_CODE = "000";
const ADMIN_SCHOOL_CODE = "0000";
const ADMIN_USERNAME = "BRGAdmin";
const ADMIN_PASSWORD = "BRGAdmin";

export default async function(req) {
  try {
    const body = await req.json();
    const { system_code, school_code, username, password } = body;

    if (!system_code || !school_code || !username || !password) {
      return Response.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check admin login
    if (
      system_code === ADMIN_SYSTEM_CODE &&
      school_code === ADMIN_SCHOOL_CODE &&
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      return Response.json({
        success: true,
        user: {
          role: "admin",
          username: ADMIN_USERNAME,
          full_name: "Administrator",
        },
      });
    }

    // Check teacher login
    const base44 = createClientFromRequest(req);
    const teachers = await base44.asServiceRole.entities.Teacher.filter({
      username: username,
      password: password,
      school_code: school_code,
      system_code: system_code,
    });

    if (teachers.length === 0) {
      return Response.json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const teacher = teachers[0];
    return Response.json({
      success: true,
      user: {
        role: teacher.role === "school_admin" ? "school_admin" : "teacher",
        username: teacher.username,
        full_name: teacher.full_name,
        school_code: teacher.school_code,
        system_code: teacher.system_code,
        school_name: teacher.school_name,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}