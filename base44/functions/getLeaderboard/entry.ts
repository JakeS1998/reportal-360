import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseSchool, fetchHtml, computeScore, CURRENT_YEAR, PREVIOUS_YEAR } from '../../shared/alsdeParser.ts';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, systemCode, schoolCode, myScore, schoolName, systemName } = body || {};

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Check cache first
    const cacheKey = action === "county" ? `county:${systemCode}` : `state:${schoolCode || "unknown"}`;
    const now = Date.now();
    const cached = await db.LeaderboardCache.filter({ cache_key: cacheKey }, "-created_date", 1);
    if (cached && cached.length > 0) {
      const age = now - new Date(cached[0].created_date).getTime();
      if (age < CACHE_TTL_MS) {
        return Response.json(cached[0].payload);
      }
    }

    if (action === "county") {
      if (!systemCode || !schoolCode) {
        return Response.json({ error: "systemCode and schoolCode required" }, { status: 400 });
      }

      const directory = await db.SchoolDirectory.filter(
        { system_code: systemCode, active: true },
        "school_name",
        100
      );

      const schools = (directory || []).filter((s) => s.school_code !== "0000").slice(0, 40);

      if (schools.length < 2) {
        return Response.json({
          error: "Not enough schools discovered for this system yet. Please try again shortly."
        });
      }

      const batchSize = 8;
      const results = [];

      for (let i = 0; i < schools.length; i += batchSize) {
        const batch = schools.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (s) => {
            try {
              const html = await fetchHtml(CURRENT_YEAR, systemCode, s.school_code);
              const data = parseSchool(html, CURRENT_YEAR, systemCode, s.school_code);
              if (!data) return null;
              const score = computeScore(data);
              if (score == null) return null;
              return {
                school_name: data.school_name || s.school_name,
                school_code: s.school_code,
                school_type: data.school_type,
                score,
                academic_achievement: data.academic_achievement,
                enrollment: data.enrollment,
              };
            } catch {
              return null;
            }
          })
        );
        results.push(...batchResults.filter((r) => r !== null));
      }

      results.sort((a, b) => b.score - a.score);

      const myIndex = results.findIndex((r) => r.school_code === schoolCode);
      const myRank = myIndex >= 0 ? myIndex + 1 : null;
      const mySchool = myIndex >= 0 ? results[myIndex] : null;
      const top5 = results.slice(0, 5);

      // Fetch previous-year scores for visible schools (top 5 + user's school)
      const trendSchools = [...top5];
      if (mySchool && !top5.includes(mySchool)) trendSchools.push(mySchool);
      await Promise.all(
        trendSchools.map(async (s) => {
          try {
            const prevHtml = await fetchHtml(PREVIOUS_YEAR, systemCode, s.school_code);
            const prevData = parseSchool(prevHtml, PREVIOUS_YEAR, systemCode, s.school_code);
            s.prevScore = prevData ? computeScore(prevData) : null;
          } catch {
            s.prevScore = null;
          }
        })
      );

      const countyPayload = {
        top5,
        myRank,
        mySchool,
        totalSchools: results.length,
      };

      await db.LeaderboardCache.create({ cache_key: cacheKey, payload: countyPayload }).catch(() => {});

      return Response.json(countyPayload);
    }

    if (action === "state") {
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search for Alabama State Department of Education (ALSDE) report card data for the 2024-2025 school year.

1. Find the top 5 highest-performing public schools in Alabama by overall school accountability score (a composite of academic achievement, academic growth, chronic absenteeism, and graduation rate, scored 0-100).
2. The school "${schoolName || "this school"}" in ${systemName || "an Alabama system"} has an overall composite score of ${myScore ?? "unknown"} (out of 100). Estimate its percentile rank and approximate rank out of roughly 1,500 Alabama public schools.

Return JSON with: top5 (array of {name, system, score}), myPercentile (number 0-100), myEstimatedRank (string like "#342 of 1,500").`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            top5: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  system: { type: "string" },
                  score: { type: "number" },
                },
              },
            },
            myPercentile: { type: "number" },
            myEstimatedRank: { type: "string" },
          },
          required: ["top5", "myPercentile", "myEstimatedRank"],
        },
      });

      await db.LeaderboardCache.create({ cache_key: cacheKey, payload: res }).catch(() => {});

      return Response.json(res);
    }

    return Response.json({ error: "Invalid action. Use 'county' or 'state'." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}