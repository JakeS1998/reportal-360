import { parseSchool, fetchHtml, CURRENT_YEAR, PREVIOUS_YEAR } from "../../shared/alsdeParser.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — ALSDE report cards update annually

export default async function (req) {
  try {
    const body = await req.json();
    const { system_code, school_code } = body;

    if (!system_code || !school_code) {
      return Response.json(
        { error: "system_code and school_code are required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const cacheKey = `schooldata:${system_code}:${school_code}`;

    // Serve from cache when fresh — avoids 4 external ALSDE fetches on every login
    const cached = await base44.asServiceRole.entities.LeaderboardCache.filter({ cache_key: cacheKey }, undefined, 1);
    if (cached.length > 0) {
      const entry = cached[0];
      const stamped = entry.updated_date || entry.created_date;
      if (stamped && Date.now() - new Date(stamped).getTime() < CACHE_TTL_MS) {
        return Response.json(entry.payload);
      }
    }

    const [currentHtml, previousHtml, countyHtml, stateHtml] = await Promise.all([
      fetchHtml(CURRENT_YEAR, system_code, school_code),
      fetchHtml(PREVIOUS_YEAR, system_code, school_code),
      fetchHtml(CURRENT_YEAR, system_code, "0000"),
      fetchHtml(CURRENT_YEAR, "000", "0000"),
    ]);

    const current = parseSchool(currentHtml, CURRENT_YEAR, system_code, school_code);
    const previous = parseSchool(previousHtml, PREVIOUS_YEAR, system_code, school_code);
    const county = parseSchool(countyHtml, CURRENT_YEAR, system_code, "0000");
    const state = parseSchool(stateHtml, CURRENT_YEAR, "000", "0000");

    if (!current) {
      return Response.json(
        { error: "School not found. Check your system and school codes." },
        { status: 404 }
      );
    }

    const benchmarkFields = (agg) => agg ? {
      school_name: agg.school_name,
      academic_achievement: agg.academic_achievement,
      academic_growth: agg.academic_growth,
      chronic_absenteeism: agg.chronic_absenteeism,
      graduation_rate: agg.graduation_rate,
      enrollment: agg.enrollment,
      math_proficiency: agg.math_proficiency,
      reading_proficiency: agg.reading_proficiency,
      science_proficiency: agg.science_proficiency,
    } : null;

    const payload = { ...current, previous, county: benchmarkFields(county), state: benchmarkFields(state) };

    // Persist to cache (single DB write; non-fatal on failure)
    try {
      if (cached.length > 0) {
        await base44.asServiceRole.entities.LeaderboardCache.update(cached[0].id, { payload });
      } else {
        await base44.asServiceRole.entities.LeaderboardCache.create({ cache_key: cacheKey, payload });
      }
    } catch {
      // cache write failure is non-fatal
    }

    return Response.json(payload);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}