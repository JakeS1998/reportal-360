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

    // Strip HTML tags and normalize whitespace
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    // Extract indicator scores (All SubPopulation rows)
    function extractScore(indicator) {
      const pattern = new RegExp(
        indicator +
          "\\s+All Grades\\s+All Gender\\s+All Race\\s+All Ethnicity\\s+All SubPopulation\\s+([\\d.]+)"
      );
      const match = text.match(pattern);
      return match ? parseFloat(match[1]) : null;
    }

    const academic_achievement = extractScore("Academic Achievement");
    const academic_growth = extractScore("Academic Growth");
    const chronic_absenteeism = extractScore("Chronic Absenteeism");

    // Extract school and system names from the first data row
    const namePattern = new RegExp(
      "\\d{4}\\s+" + system_code + "\\s+(.+?)\\s+" + school_code + "\\s+(.+?)\\s+Academic Achievement"
    );
    const nameMatch = text.match(namePattern);
    const system_name = nameMatch ? nameMatch[1].trim() : "";
    const school_name = nameMatch ? nameMatch[2].trim() : "";

    // Extract enrollment from demographics section
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

    return Response.json({
      school_name,
      system_name,
      school_code,
      system_code,
      year: "2025",
      academic_achievement,
      academic_growth,
      chronic_absenteeism,
      enrollment,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}