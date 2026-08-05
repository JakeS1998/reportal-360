import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAdmin } from '../../shared/adminAuth.ts';

export default async function (req) {
  try {
    const ok = await verifyAdmin(req);
    if (!ok) return Response.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { resource = "systems", systemCode, schoolCode } = body || {};
    const db = createClientFromRequest(req).asServiceRole.entities;

    if (resource === "systems") {
      const systems = await db.SchoolSystem.filter({}, "district_name", 500);
      return Response.json({ systems });
    }

    if (resource === "schools") {
      const schools = await db.SchoolDirectory.filter({}, "school_name", 2000);
      return Response.json({ schools });
    }

    if (resource === "schoolsBySystem") {
      if (!systemCode) return Response.json({ error: "systemCode required" }, { status: 400 });
      const schools = await db.SchoolDirectory.filter({ system_code: systemCode }, "school_name", 500);
      return Response.json({ systemCode, schools });
    }

    if (resource === "school") {
      if (!systemCode || !schoolCode) return Response.json({ error: "systemCode and schoolCode required" }, { status: 400 });
      const key = `${systemCode}-${schoolCode}`;
      const schools = await db.SchoolDirectory.filter({ school_key: key });
      return Response.json({ school: schools[0] || null });
    }

    if (resource === "stats") {
      const systems = await db.SchoolSystem.filter({ active: true });
      const schools = await db.SchoolDirectory.filter({ active: true });
      const runs = await db.DiscoveryRun.list("-start_time", 5);
      return Response.json({
        totalSystems: systems.length,
        totalSchools: schools.length,
        lastRefresh: runs[0] ? runs[0].start_time : null,
        lastRun: runs[0] || null,
        recentRuns: runs,
      });
    }

    return Response.json({ error: "Unknown resource" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}