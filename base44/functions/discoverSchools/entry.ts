import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAdmin } from '../../shared/adminAuth.ts';
import { discoverSystems, discoverSchoolsForSystems } from '../../shared/providers/alabama.ts';

export default async function (req) {
  try {
    const body = await req.json();
    const { phase = "systems", batchStart = 0, batchSize = 8, runType = "full", trigger = "manual", runId } = body;

    const ok = await verifyAdmin(req, body);
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

    // Helper: upsert a system
    const upsertSystem = async (s) => {
      if (!s.system_code) return false;
      const existing = await db.SchoolSystem.filter({ system_code: s.system_code });
      if (existing.length) {
        await db.SchoolSystem.update(existing[0].id, { district_name: s.district_name, active: true, last_verified: now, last_updated: now });
        return false;
      }
      await db.SchoolSystem.create({ system_code: s.system_code, district_name: s.district_name, active: true, date_discovered: now, last_verified: now, last_updated: now });
      return true;
    };
    // Helper: upsert a school
    const upsertSchool = async (sysCode, sc) => {
      if (!sc.school_code) return null;
      const key = `${sysCode}-${sc.school_code}`;
      const existing = await db.SchoolDirectory.filter({ school_key: key });
      if (existing.length) {
        const changed = existing[0].school_name !== sc.school_name;
        await db.SchoolDirectory.update(existing[0].id, { school_name: sc.school_name, active: true, status: changed ? "updated" : "active", last_verified: now, last_updated: now });
        return changed ? "updated" : "same";
      }
      await db.SchoolDirectory.create({ school_key: key, system_code: sysCode, school_code: sc.school_code, school_name: sc.school_name, active: true, status: "new", date_discovered: now, last_verified: now, last_updated: now });
      return "new";
    };

    // SINGLE PHASE: discover schools for one system (debug / on-demand)
    if (phase === "single") {
      const { systemCode } = body;
      if (!systemCode) return Response.json({ error: "systemCode required" }, { status: 400 });
      const sys = await db.SchoolSystem.filter({ system_code: systemCode });
      const sysMeta = sys[0] ? { system_code: sys[0].system_code, district_name: sys[0].district_name } : { system_code: systemCode, district_name: "" };
      const result = await discoverSchoolsForSystems([sysMeta]);
      const items = (result.results && result.results[systemCode]) || [];
      return Response.json({ systemCode, system: sysMeta, raw: result, itemsCount: items.length, items: items.slice(0, 50) });
    }

    // SCHEDULED PHASE: refresh systems + process a rotating chunk of schools (one function call)
    if (phase === "scheduled") {
      const sysResult = await discoverSystems();
      let systemsCount = 0;
      if (sysResult.error) {
        pushLog("Systems refresh error: " + sysResult.error);
        errors.push({ time: now, system: "*", message: sysResult.error });
      } else {
        for (const s of sysResult.systems) { if (await upsertSystem(s)) systemsCount++; }
        pushLog(`Refreshed ${sysResult.systems.length} systems.`);
      }
      const allSystems = await db.SchoolSystem.filter({ active: true });
      const chunkSize = 20;
      const numChunks = Math.max(1, Math.ceil(allSystems.length / chunkSize));
      const dayIndex = Math.floor(Date.now() / 86400000);
      const chunkIndex = dayIndex % numChunks;
      const chunk = allSystems.slice(chunkIndex * chunkSize, chunkIndex * chunkSize + chunkSize);
      let schoolsFound = 0, newSchools = 0, updatedSchools = 0;
      try {
        const result = await discoverSchoolsForSystems(chunk);
        if (result.error) { pushLog("Chunk error: " + result.error); errors.push({ time: now, system: "*", message: result.error }); }
        for (const sys of chunk) {
          const schools = (result.results && result.results[sys.system_code]) || [];
          for (const sc of schools) {
            const r = await upsertSchool(sys.system_code, sc);
            if (r === "new") newSchools++;
            else if (r === "updated") updatedSchools++;
            if (r) schoolsFound++;
          }
          pushLog(`✔ ${sys.district_name} (${sys.system_code}): ${schools.length} schools`);
        }
      } catch (e) {
        pushLog(`✘ Chunk exception: ${e.message}`);
        errors.push({ time: now, system: "*", message: e.message });
      }
      const totals = await db.SchoolDirectory.filter({ active: true });
      await db.DiscoveryRun.update(run.id, {
        log, errors, status: "completed", finish_time: now, duration_ms: Date.now() - new Date(run.start_time).getTime(),
        systems_count: allSystems.length, schools_count: totals.length, new_schools: newSchools, updated_schools: updatedSchools,
      });
      return Response.json({ runId: run.id, phase: "scheduled", chunkIndex, numChunks, systemsTotal: allSystems.length, schoolsFound, newSchools, updatedSchools, totalSchools: totals.length, done: true, log, errors });
    }

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

    // PHASE 2: discover schools in batches (one browser session per batch)
    const allSystems = await db.SchoolSystem.filter({ active: true });
    const batch = allSystems.slice(batchStart, batchStart + batchSize);
    let schoolsFound = 0, newSchools = 0, updatedSchools = 0;

    try {
      const result = await discoverSchoolsForSystems(batch);
      if (result.error) {
        pushLog(`Batch error: ${result.error}`);
        errors.push({ time: now, system: "*", message: result.error });
      }
      for (const sys of batch) {
        const schools = (result.results && result.results[sys.system_code]) || [];
        if (!schools.length) {
          pushLog(`○ ${sys.district_name} (${sys.system_code}): no schools`);
          continue;
        }
        for (const sc of schools) {
          if (!sc.school_code) continue;
          const key = `${sys.system_code}-${sc.school_code}`;
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
        pushLog(`✔ ${sys.district_name} (${sys.system_code}): ${schools.length} schools`);
      }
    } catch (e) {
      pushLog(`✘ Batch exception: ${e.message}`);
      errors.push({ time: now, system: "*", message: e.message });
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