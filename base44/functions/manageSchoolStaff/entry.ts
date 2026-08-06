import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_USERNAME = "BRGAdmin";
const ADMIN_PASSWORD = "BRGAdmin";

function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

function makeUsername(schoolCode, fullName) {
  const namePart = fullName.toLowerCase()
    .replace(/[^a-z]/g, "")
    .split(" ")
    .join("");
  return `${schoolCode}.${namePart}`;
}

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, ...params } = body;

    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({
        username: caller_username,
        password: caller_password,
      });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    // --- CREATE ---
    if (action === "create") {
      const { full_name, role, school_code, system_code, school_name, system_name, email, username: customUsername, password: customPassword, subject } = params;

      if (!full_name || !role || !school_code || !system_code) {
        return Response.json(
          { success: false, error: "full_name, role, school_code, system_code are required" },
          { status: 400 }
        );
      }

      // Permission checks
      if (callerRole === "admin") {
        // admin can create any role anywhere
      } else if (callerRole === "area") {
        if (system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "You can only create users in your system" }, { status: 403 });
        }
        if (role === "area") {
          return Response.json({ success: false, error: "Only admins can create area users" }, { status: 403 });
        }
      } else if (callerRole === "manager") {
        if (system_code !== callerSystemCode || school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "You can only create users in your school" }, { status: 403 });
        }
        if (role !== "teacher") {
          return Response.json({ success: false, error: "Managers can only create teacher accounts" }, { status: 403 });
        }
      } else {
        return Response.json({ success: false, error: "Not authorized to create users" }, { status: 403 });
      }

      const username = (customUsername || "").trim() || makeUsername(school_code, full_name);

      // Check for duplicate username
      const existing = await base44.asServiceRole.entities.Teacher.filter({ username });
      if (existing.length > 0) {
        return Response.json({ success: false, error: "A user with this name already exists at this school" }, { status: 400 });
      }

      const tempPassword = (customPassword || "").trim() || generateRandomPassword();

      const created = await base44.asServiceRole.entities.Teacher.create({
        username,
        password: tempPassword,
        full_name,
        role,
        school_code,
        system_code,
        school_name: school_name || "",
        system_name: system_name || "",
        email: email || "",
        subject: subject || "",
        teacher_id: username,
        password_reset_required: true,
      });

      return Response.json({
        success: true,
        user: {
          id: created.id,
          username: created.username,
          full_name: created.full_name,
          role: created.role,
          school_code: created.school_code,
          school_name: created.school_name,
        },
        temp_password: tempPassword,
      });
    }

    // --- LIST ---
    if (action === "list") {
      const { system_code, school_code } = params;
      let filter = {};

      if (callerRole === "admin") {
        if (system_code) filter.system_code = system_code;
        if (school_code) filter.school_code = school_code;
      } else if (callerRole === "area") {
        filter.system_code = callerSystemCode;
        if (school_code) filter.school_code = school_code;
      } else if (callerRole === "manager") {
        filter.system_code = callerSystemCode;
        filter.school_code = callerSchoolCode;
      } else {
        return Response.json({ success: false, error: "Not authorized to list users" }, { status: 403 });
      }

      const list = await base44.asServiceRole.entities.Teacher.filter(filter, "-created_date", 500);
      return Response.json({ success: true, users: list });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { user_id } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.role !== "teacher") {
          return Response.json({ success: false, error: "Managers can only remove teachers" }, { status: 403 });
        }
      }
      await base44.asServiceRole.entities.Teacher.delete(user_id);
      return Response.json({ success: true });
    }

    // --- RESET PASSWORD (admin/area/manager regenerates a temp password) ---
    if (action === "reset_password") {
      const { user_id } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
      }
      const newPassword = generateRandomPassword();
      await base44.asServiceRole.entities.Teacher.update(user_id, {
        password: newPassword,
        password_reset_required: true,
      });
      return Response.json({ success: true, temp_password: newPassword });
    }

    // --- UPDATE ---
    if (action === "update") {
      const { user_id, ...updates } = params;
      if (!user_id) {
        return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Teacher.get(user_id);
      if (!existing) {
        return Response.json({ success: false, error: "User not found" }, { status: 404 });
      }
      if (callerRole !== "admin") {
        if (existing.system_code !== callerSystemCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.school_code !== callerSchoolCode) {
          return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
        }
        if (callerRole === "manager" && existing.role !== "teacher") {
          return Response.json({ success: false, error: "Managers can only edit teachers" }, { status: 403 });
        }
      }
      if (updates.role !== undefined && updates.role !== existing.role && callerRole !== "admin") {
        return Response.json({ success: false, error: "Only admins can change roles" }, { status: 403 });
      }
      const allowedFields = ["full_name", "email", "subject", "department", "job_title", "active", "role"];
      const updateData = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) updateData[field] = updates[field];
      }
      await base44.asServiceRole.entities.Teacher.update(user_id, updateData);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}