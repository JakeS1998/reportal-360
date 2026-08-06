import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { username, current_password, new_password } = body;

    if (!username || !current_password || !new_password) {
      return Response.json(
        { success: false, error: "Username, current password, and new password are required" },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return Response.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Verify current password
    const users = await base44.asServiceRole.entities.Teacher.filter({
      username: username,
      password: current_password,
    });

    if (users.length === 0) {
      return Response.json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const user = users[0];
    await base44.asServiceRole.entities.Teacher.update(user.id, {
      password: new_password,
      password_reset_required: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}