import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAdmin } from '../../shared/adminAuth.ts';
import { discoverSystems, discoverSchoolsForSystem } from '../../shared/providers/alabama.ts';

export default async function (req) {
  try {
    const body = await req.json();
    const { phase = "systems", batchStart = 0, batchSize = 8, runType = "full", trigger = "manual", runId } = body;

    const ok = await verifyAdmin(req);
    if (!ok) return Response.json({ error: "Admin access required" }, { status: 403 });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const now = new Date().toISOString();

    let run = null;
    if (runId) {
      run = await db.DiscoveryRun.get(runId).catch(() => null);
    }
    if (!run) {
      run = await db.DiscoveryRun.create({
        run_type: runType,
        status: "running",
        start_time: now,
        systems_count: 0,
        schools_count: 0,
        new_schools: 0,
        updated_schools: 0,
        removed_schools: 0,
        errors: [],
        log: ["Discovery started"],
        trigger,
      });
    }
    const log = (run.log || []).slice();
    const errors = (run.errors || []).slice();
    const pushLog = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); };

    // PHASE 1: discover systems
    if (phase === "systems") {
      const result = await discoverSystems();
      if (result.error) {
        pushLog("Systems discovery error: " + result.error);
        errors.push({ time: now, system: "*", message: result.error });
      }
      const systems = result.systems || [];
      let newSys = 0;
      for (const s of systems) {
        if (!s.system_code) continue;
        const existing = await db.SchoolSystem.filter({ system_code: s.system_code });
        if (existing.length) {
          await db.SchoolSystem.update(existing[0].id, {
            district_name: s.district_name,
            active: true,
            last_verified: now,
            last_updated: now,
          });
        } else {
          await db.SchoolSystem.create({
            system_code: s.system_code,
            district_name: s.district_name,
            active: true,
            date_discovered: now,
            last_verified: now,
            last_updated: now,
          });
          newSys++;
        }
      }
      pushLog(`Discovered ${systems.length} systems (${newSys} new).`);
      await db.DiscoveryRun.update(run.id, {
        log, errors, systems_count: systems.length, status: systems.length ? "running" : "failed",
      });
      return Response.json({
        runId: run.id,
        phase: "schools",
        systemsTotal: systems.length,
        batchStart: 0,
        batchSize,
        log, errors,
        done: systems.length === 0,
        message: result.error || `Discovered ${systems.length} systems`,
      });
    }

    // PHASE 2: discover schools in batches
    const allSystems = await db.SchoolSystem.filter({ active: true });
    const batch = allSystems.slice(batchStart, batchStart + batchSize);
    let schoolsFound = 0, newSchools = 0, updatedSchools = 0;

    for (const sys of batch) {
      try {
        const result = await discoverSchoolsForSystem(sys.system_code, sys.district_name);
        if (result.error) {
          pushLog(`System ${sys.system_code} (${sys.district_name}): ${result.error}`);
          errors.push({ time: now, system: sys.system_code, message: result.error });
          continue;
        }
        const discoveredCodes = new Set();
        for (const sc of result.schools) {
          if (!sc.school_code) continue;
          const key = `${sys.system_code}-${sc.school_code}`;
          discoveredCodes.add(sc.school_code);
          const existing = await db.SchoolDirectory.filter({ school_key: key });
          if (existing.length) {
            const changed = existing[0].school_name !== sc.school_name;
            await db.SchoolDirectory.update(existing[0].id, {
              school_name: sc.school_name,
              active: true,
              status: changed ? "updated" : "active",
              last_verified: now,
              last_updated: now,
            });
            if (changed) updatedSchools++;
          } else {
            await db.SchoolDirectory.create({
              school_key: key,
              system_code: sys.system_code,
              school_code: sc.school_code,
              school_name: sc.school_name,
              active: true,
              status: "new",
              date_discovered: now,
              last_verified: now,
              last_updated: now,
            });
            newSchools++;
          }
          schoolsFound++;
        }
        pushLog(`✔ ${sys.district_name} (${sys.system_code}): ${result.schools.length} schools`);
      } catch (e) {
        pushLog(`✘ ${sys.district_name} (${sys.system_code}): ${e.message}`);
        errors.push({ time: now, system: sys.system_code, message: e.message });
      }
    }

    const nextBatch = batchStart + batchSize;
    const done = nextBatch >= allSystems.length;
    const finish = done ? new Date().toISOString() : null;
    const duration = done ? Date.now() - new Date(run.start_time).getTime() : null;

    const totals = await db.SchoolDirectory.filter({ active: true });

    const updateData = {
      log, errors,
      schools_count: (run.schools_count || 0) + schoolsFound,
      new_schools: (run.new_schools || 0) + newSchools,
      updated_schools: (run.updated_schools || 0) + updatedSchools,
    };
    if (done) {
      updateData.status = errors.length ? "partial" : "completed";
      updateData.finish_time = finish;
      updateData.duration_ms = duration;
      updateData.systems_count = allSystems.length;
      updateData.schools_count = totals.length;
    }
    await db.DiscoveryRun.update(run.id, updateData);

    return Response.json({
      runId: run.id,
      phase: "schools",
      batchStart: nextBatch,
      batchSize,
      systemsTotal: allSystems.length,
      processed: batch.length,
      schoolsFound,
      newSchools,
      updatedSchools,
      done,
      log, errors,
      totalSchools: totals.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}