// Shared ALSDE report card parsing logic used by fetchSchoolData and getLeaderboard.

export const CURRENT_YEAR = "2025";
export const PREVIOUS_YEAR = "2024";

export function buildUrl(year, sysCode, schCode) {
  return `https://reportcard.alsde.edu/SupportingData.aspx?ReportYear=${year}&SystemCode=${sysCode}&SchoolCode=${schCode}`;
}

export async function fetchHtml(year, sysCode, schCode) {
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

export function parseSchool(html, year, sysCode, schCode) {
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
  const demoEnrollment = demoRow ? parseInt(demoRow[1]) : null;
  const raceCount = (idx) => parseNum(demoRow ? demoRow[idx] : null);
  const racePct = (count) => count != null && demoEnrollment ? Math.round((count / demoEnrollment) * 1000) / 10 : null;
  const demographics_race = demoRow
    ? [
        { label: "White", count: raceCount(10), percent: racePct(raceCount(10)) },
        { label: "Black or African American", count: raceCount(4), percent: racePct(raceCount(4)) },
        { label: "Asian", count: raceCount(2), percent: racePct(raceCount(2)) },
        { label: "American Indian / Alaska Native", count: raceCount(6), percent: racePct(raceCount(6)) },
        { label: "Native Hawaiian / Pacific Islander", count: raceCount(8), percent: racePct(raceCount(8)) },
        { label: "Two or more races", count: raceCount(12), percent: racePct(raceCount(12)) },
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
    school_code: schCode,
    system_code: sysCode,
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

export function computeScore(data) {
  if (!data) return null;
  const comps = [];
  if (data.academic_achievement != null) comps.push({ w: 30, v: data.academic_achievement });
  if (data.academic_growth != null) comps.push({ w: 30, v: data.academic_growth });
  if (data.chronic_absenteeism != null) comps.push({ w: 20, v: 100 - data.chronic_absenteeism });
  if (data.graduation_rate != null && data.school_type === "High") comps.push({ w: 20, v: data.graduation_rate });
  if (!comps.length) return null;
  const tw = comps.reduce((a, c) => a + c.w, 0);
  return Math.round(comps.reduce((a, c) => a + c.v * (c.w / tw), 0) * 100) / 100;
}