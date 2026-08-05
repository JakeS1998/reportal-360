export default async function(req) {
  try {
    const body = await req.json();
    const { system_code, school_code } = body;

    if (!system_code || !school_code) {
      return Response.json(
        { error: "system_code and school_code are required" },
        { status: 400 }
      );
    }

    const url = `https://reportcard.alsde.edu/SupportingData.aspx?ReportYear=2025&SystemCode=${system_code}&SchoolCode=${school_code}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch school data from ALSDE" },
        { status: 502 }
      );
    }

    const html = await response.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    function extractScore(indicator) {
      const pattern = new RegExp(
        indicator +
          "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+All SubPopulation\\s+(\\d+\\.\\d+)"
      );
      const match = text.match(pattern);
      return match ? parseFloat(match[1]) : null;
    }

    // Aggregate proficiency: 5th token after "All SubPopulation" is the proficiency %.
    function extractProficiency(subject) {
      const pattern = new RegExp(
        subject +
          "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+All SubPopulation\\s+\\S+\\s+\\S+\\s+\\S+\\s+\\S+\\s+([\\d.]+)"
      );
      const match = text.match(pattern);
      return match ? parseFloat(match[1]) : null;
    }

    // Parse a numeric value that may be suppressed ("*" or "~").
    function parseNum(val) {
      if (val == null || val === "*" || val === "~") return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    }

    // Subpopulations reported in the proficiency section.
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

    function escapeRe(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

    // Demographics: race percentages from the "All SubPopulation" row.
    // Columns: Total, Asian, Asian%, Black, Black%, AI, AI%, NH, NH%, White, White%, TwoOrMore, TwoOrMore%
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

    // Demographics: subgroup counts (Total Student Count is first number after subpop name).
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

    const viewStateMatch = html.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/i);
    const eventValMatch = html.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/i);
    const genMatch = html.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/i);
    const viewState = viewStateMatch ? viewStateMatch[1] : "";
    const eventVal = eventValMatch ? eventValMatch[1] : "";
    const viewStateGen = genMatch ? genMatch[1] : "";

    async function fetchCsv(buttonName) {
      const formBody = new URLSearchParams();
      formBody.append("__EVENTTARGET", "");
      formBody.append("__EVENTARGUMENT", "");
      formBody.append("__VIEWSTATE", viewState);
      formBody.append("__EVENTVALIDATION", eventVal);
      if (viewStateGen) formBody.append("__VIEWSTATEGENERATOR", viewStateGen);
      formBody.append(buttonName, "Export to CSV");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
        body: formBody.toString(),
      });
      return await res.text();
    }

    const setCookie = response.headers.get("set-cookie") || "";
    const cookies = setCookie.split(/,(?=[^;]+?=)/).map(c => c.split(";")[0]).join("; ");

    async function fetchCsv(buttonName) {
      const formBody = new URLSearchParams();
      formBody.append("__EVENTTARGET", "");
      formBody.append("__EVENTARGUMENT", "");
      formBody.append("__VIEWSTATE", viewState);
      formBody.append("__EVENTVALIDATION", eventVal);
      if (viewStateGen) formBody.append("__VIEWSTATEGENERATOR", viewStateGen);
      formBody.append(buttonName, "Export to CSV");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          "Cookie": cookies,
          "Referer": url,
        },
        body: formBody.toString(),
      });
      return await res.text();
    }

    const profCsv = await fetchCsv("ctl00$CPH$ReportCard$btnProficiencyDataCSVExport");
    const _debug = { cookies, csvLen: profCsv.length, csvSample: profCsv.substring(0, 800) };

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

    // Extract school and system names from the first data row
    const namePattern = new RegExp(
      "\\d{4}\\s+" + system_code + "\\s+(.+?)\\s+" + school_code + "\\s+(.+?)\\s+Academic Achievement"
    );
    const nameMatch = text.match(namePattern);
    const system_name = nameMatch ? nameMatch[1].trim() : "";
    const school_name = nameMatch ? nameMatch[2].trim() : "";

    const enrollMatch = text.match(
      /All Gender\s+All Ethnicity\s+All SubPopulation\s+(\d+)/
    );
    const enrollment = enrollMatch ? parseInt(enrollMatch[1]) : null;

    if (!school_name) {
      return Response.json(
        { error: "School not found. Check your system and school codes." },
        { status: 404 }
      );
    }

    const lower = school_name.toLowerCase();
    let school_type = "Other";
    if (lower.includes("elementary")) school_type = "Elementary";
    else if (lower.includes("middle") || lower.includes("junior high")) school_type = "Middle";
    else if (lower.includes("high")) school_type = "High";
    else if (lower.includes("k-12") || lower.includes("k12")) school_type = "K-12";

    return Response.json({ _debug });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}