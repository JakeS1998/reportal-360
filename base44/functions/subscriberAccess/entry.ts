import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public (no auth) endpoint for the subscriber login flow.
// - action: "schoolsBySystem"  -> lists active schools in a system
// - action: "validate"         -> validates an access code for a school
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, systemCode, schoolCode, accessCode } = body || {};
    const db = createClientFromRequest(req).asServiceRole.entities;

    if (action === "schoolsBySystem") {
      if (!systemCode) return Response.json({ error: "systemCode required" }, { status: 400 });
      const schools = await db.SchoolDirectory.filter(
        { system_code: systemCode, active: true },
        "school_name",
        500
      );
      return Response.json({
        systemCode,
        schools: schools.map((s) => ({
          school_code: s.school_code,
          school_name: s.school_name,
          school_type: s.school_type,
          grade_range: s.grade_range,
        })),
      });
    }

    if (action === "validate") {
      if (!schoolCode || !accessCode) {
        return Response.json(
          { valid: false, error: "School code and access code are required" },
          { status: 400 }
        );
      }
      const codes = await db.AccessCode.filter({
        code: accessCode,
        school_code: schoolCode,
        active: true,
      });
      if (codes.length === 0) {
        return Response.json({ valid: false, error: "Invalid or inactive access code for this school" });
      }
      const rec = codes[0];
      if (rec.expires_at && new Date(rec.expires_at) < new Date()) {
        return Response.json({ valid: false, error: "Access code has expired" });
      }
      return Response.json({ valid: true, school_name: rec.school_name });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}