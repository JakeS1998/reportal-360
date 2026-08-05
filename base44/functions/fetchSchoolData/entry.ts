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

    const CURRENT_YEAR = "2025";
    const PREVIOUS_YEAR = "2024";

    function buildUrl(year, sysCode, schCode) {
      return `https://reportcard.alsde.edu/SupportingData.aspx?ReportYear=${year}&SystemCode=${sysCode}&SchoolCode=${schCode}`;
    }

    async function fetchHtml(year, sysCode, schCode) {
      const res = await fetch(buildUrl(year, sysCode, schCode), {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) return null;
      return await res.text();
    }

    function cleanText(html) {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
    }

    function parseNum(val) {
      if (val == null || val === "*" || val === "~") return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    }

    function escapeRe(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    const PROFICIENCY_SUBPOPS = [
      "All SubPopulation",
      "Economically Disadvantaged",
      "Non-Economically Disadvantaged",
      "Students with Disabilities",
      "General Education Students",
      "Students with Limited English Proficiency",
      "Homeless",
      "Foster",
      "Military Family",
    ];

    const DEMO_SUBGROUPS = [
      "Economically Disadvantaged",
      "Non-Economically Disadvantaged",
      "Students with Disabilities",
      "General Education Students",
      "Students with Limited English Proficiency",
      "Homeless",
      "Foster",
      "Military Family",
    ];

    function parseSchool(html, year, sysCode, schCode) {
      if (!html) return null;
      const text = cleanText(html);

      function extractScore(indicator) {
        const pattern = new RegExp(
          indicator +
            "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+All SubPopulation\\s+(\\d+\\.\\d+)"
        );
        const match = text.match(pattern);
        return match ? parseFloat(match[1]) : null;
      }

      function extractProficiency(subject) {
        const pattern = new RegExp(
          subject +
            "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+All SubPopulation\\s+\\S+\\s+\\S+\\s+\\S+\\s+\\S+\\s+([\\d.]+)"
        );
        const match = text.match(pattern);
        return match ? parseFloat(match[1]) : null;
      }

      function extractProficiencyBySubpop(subject) {
        const rows = [];
        for (const sub of PROFICIENCY_SUBPOPS) {
          const pattern = new RegExp(
            subject +
              "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+" +
              escapeRe(sub) +
              "\\s+\\S+\\s+\\S+\\s+\\S+\\s+\\S+\\s+([\\d.]+)"
          );
          const match = text.match(pattern);
          rows.push({
            label: sub === "All SubPopulation" ? "All Students" : sub,
            rate: match ? parseFloat(match[1]) : null,
          });
        }
        return rows;
      }

      const demoRow = text.match(
        /All Grades\s+All Gender\s+All Ethnicity\s+All SubPopulation\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/
      );
      const demographics_race = demoRow
        ? [
            { label: "White", percent: parseNum(demoRow[11]) },
            { label: "Black or African American", percent: parseNum(demoRow[5]) },
            { label: "Asian", percent: parseNum(demoRow[3]) },
            { label: "American Indian / Alaska Native", percent: parseNum(demoRow[7]) },
            { label: "Native Hawaiian / Pacific Islander", percent: parseNum(demoRow[9]) },
            { label: "Two or more races", percent: parseNum(demoRow[13]) },
          ]
        : [];

      const demographics_subgroups = DEMO_SUBGROUPS.map((name) => {
        const pattern = new RegExp(
          "All Gender\\s+All Ethnicity\\s+" + escapeRe(name) + "\\s+(\\d+|\\*)"
        );
        const match = text.match(pattern);
        return {
          label: name,
          count: match && match[1] !== "*" ? parseInt(match[1]) : null,
        };
      });

      const academic_achievement = extractScore("Academic Achievement");
      const academic_growth = extractScore("Academic Growth");
      const chronic_absenteeism = extractScore("Chronic Absenteeism");
      const graduation_rate = extractScore("Graduation Rate");
      const math_proficiency = extractProficiency("Math");
      const reading_proficiency = extractProficiency("ELA");
      const science_proficiency = extractProficiency("Science");

      const proficiency_by_subpopulation = {
        math: extractProficiencyBySubpop("Math"),
        reading: extractProficiencyBySubpop("ELA"),
        science: extractProficiencyBySubpop("Science"),
      };

      const namePattern = new RegExp(
        "\\d{4}\\s+" + sysCode + "\\s+(.+?)\\s+" + schCode + "\\s+(.+?)\\s+Academic Achievement"
      );
      const nameMatch = text.match(namePattern);
      const system_name = nameMatch ? nameMatch[1].trim() : "";
      const school_name = nameMatch ? nameMatch[2].trim() : "";

      const enrollMatch = text.match(
        /All Gender\s+All Ethnicity\s+All SubPopulation\s+(\d+)/
      );
      const enrollment = enrollMatch ? parseInt(enrollMatch[1]) : null;

      if (!school_name) return null;

      const lower = school_name.toLowerCase();
      let school_type = "Other";
      if (lower.includes("elementary")) school_type = "Elementary";
      else if (lower.includes("middle") || lower.includes("junior high")) school_type = "Middle";
      else if (lower.includes("high")) school_type = "High";
      else if (lower.includes("k-12") || lower.includes("k12")) school_type = "K-12";

      return {
        school_name,
        school_code,
        system_code,
        system_name,
        school_type,
        year,
        enrollment,
        academic_achievement,
        academic_growth,
        chronic_absenteeism,
        graduation_rate,
        math_proficiency,
        reading_proficiency,
        science_proficiency,
        proficiency_by_subpopulation,
        demographics_race,
        demographics_subgroups,
      };
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