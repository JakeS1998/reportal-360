import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_USERNAME = "BRGAdmin";
const ADMIN_PASSWORD = "BRGAdmin";

export default async function(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Admin login (hardcoded super admin)
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return Response.json({
        success: true,
        user: {
          role: "admin",
          username: ADMIN_USERNAME,
          full_name: "Administrator",
          password_reset_required: false,
        },
      });
    }

    // User login — look up by username only
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.Teacher.filter({
      username: username,
      password: password,
    });

    if (users.length === 0) {
      return Response.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = users[0];
    return Response.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        password: user.password,
        full_name: user.full_name,
        school_code: user.school_code,
        system_code: user.system_code,
        school_name: user.school_name,
        system_name: user.system_name,
        email: user.email,
        teacher_id: user.teacher_id,
        password_reset_required: user.password_reset_required,
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}