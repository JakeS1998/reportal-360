import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const body = await req.json();
    const { school_code, access_code } = body;

    if (!school_code || !access_code) {
      return Response.json(
        { valid: false, error: "School code and access code are required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { valid: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const codes = await base44.asServiceRole.entities.AccessCode.filter({
      code: access_code,
      school_code: school_code,
      active: true,
    });

    if (codes.length === 0) {
      return Response.json({
        valid: false,
        error: "Invalid or inactive access code for this school",
      });
    }

    const codeRecord = codes[0];

    if (codeRecord.expires_at) {
      const expiry = new Date(codeRecord.expires_at);
      if (expiry < new Date()) {
        return Response.json({
          valid: false,
          error: "Access code has expired",
        });
      }
    }

    return Response.json({ valid: true });
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
}