import { parseSchool, fetchHtml, CURRENT_YEAR, PREVIOUS_YEAR } from "../../shared/alsdeParser.ts";

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

    return Response.json({ ...current, previous, county: benchmarkFields(county), state: benchmarkFields(state) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}