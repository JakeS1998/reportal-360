import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const reviewYear = body.year || String(new Date().getFullYear());
    const startedDate = new Date().toISOString().split("T")[0];

    // Enumerate every active school in the directory
    const schools = await base44.asServiceRole.entities.SchoolDirectory.filter({ active: true }, undefined, 500);

    let created = 0;
    let skipped = 0;
    for (const s of schools) {
      // Skip if an active review already exists for this school + year
      const existing = await base44.asServiceRole.entities.AccessReview.filter({
        school_code: s.school_code,
        year: reviewYear,
        status: "active",
      });
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await base44.asServiceRole.entities.AccessReview.create({
        school_code: s.school_code,
        school_name: s.school_name,
        system_code: s.system_code,
        year: reviewYear,
        status: "active",
        started_date: startedDate,
      });
      created++;
    }

    await logAudit(
      base44,
      "admin_action",
      "system",
      "admin",
      `Annual access review opened for ${created} school(s), ${skipped} already active — year ${reviewYear}`,
      undefined,
      { action_type: "access_review_started" }
    );

    return Response.json({
      success: true,
      year: reviewYear,
      created,
      skipped,
      total: schools.length,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}