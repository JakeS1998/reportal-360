import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAdmin } from '../../shared/adminAuth.ts';

export default async function (req) {
  try {
    const ok = await verifyAdmin(req);
    if (!ok) return Response.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action } = body || {};
    const db = createClientFromRequest(req).asServiceRole.entities;

    if (action === "list") {
      const codes = await db.AccessCode.list("-created_date", 200);
      return Response.json({ codes });
    }

    if (action === "create") {
      const { code, scope, school_code, school_name, system_code, system_name, expires_at, notes } = body;
      if (!code) {
        return Response.json({ error: "code is required" }, { status: 400 });
      }
      const finalScope = scope === "system" ? "system" : "school";

      if (finalScope === "system") {
        if (!system_code) {
          return Response.json({ error: "system_code is required for system-scope codes" }, { status: 400 });
        }
        const existing = await db.AccessCode.filter({ code, scope: "system", system_code, active: true });
        if (existing.length) {
          return Response.json({ error: "An active system access code with this value already exists for this system" }, { status: 409 });
        }
        const record = await db.AccessCode.create({
          code,
          scope: "system",
          school_code: "0000",
          school_name: null,
          system_code,
          system_name: system_name || null,
          active: true,
          expires_at: expires_at || null,
          notes: notes || null,
        });
        return Response.json({ code: record });
      }

      if (!school_code) {
        return Response.json({ error: "school_code is required for school-scope codes" }, { status: 400 });
      }
      // Prevent duplicate active codes for the same school
      const existing = await db.AccessCode.filter({ code, scope: "school", school_code, active: true });
      if (existing.length) {
        return Response.json({ error: "An active access code with this value already exists for this school" }, { status: 409 });
      }
      const record = await db.AccessCode.create({
        code,
        scope: "school",
        school_code,
        school_name: school_name || null,
        active: true,
        expires_at: expires_at || null,
        notes: notes || null,
      });
      return Response.json({ code: record });
    }

    if (action === "deactivate") {
      const { id } = body;
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      await db.AccessCode.update(id, { active: false });
      return Response.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      await db.AccessCode.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}