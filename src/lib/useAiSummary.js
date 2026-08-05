import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useAiSummary({ school, overall, subject }) {
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school || !school.academic_achievement) return;
    setLoading(true);
    const p = school.previous || {};
    const c = school.county || {};
    const s = school.state || {};
    const focusSubject = subject && subject !== "All Subjects" ? `\nFocus your analysis specifically on ${subject} proficiency performance.` : "";
    const prompt = `You are an education analytics assistant for Alabama school leaders. Given this ALSDE report card data, produce a structured executive analysis.${focusSubject}

School: ${school.school_name} — ${school.system_name} (${school.school_type}, FY ${school.year})
- Academic Achievement: ${school.academic_achievement} (prev ${p.academic_achievement ?? "—"})
- Academic Growth: ${school.academic_growth} (prev ${p.academic_growth ?? "—"})
- Chronic Absenteeism: ${school.chronic_absenteeism}% (prev ${p.chronic_absenteeism ?? "—"}%)
- Graduation Rate: ${school.graduation_rate ?? "—"}% (prev ${p.graduation_rate ?? "—"}%)
- Math Proficiency: ${school.math_proficiency ?? "—"}%
- Reading Proficiency: ${school.reading_proficiency ?? "—"}%
- Science Proficiency: ${school.science_proficiency ?? "—"}%
- Overall composite score: ${overall}

County averages (${c.school_name || "system"}): Academic Achievement ${c.academic_achievement ?? "—"}, Growth ${c.academic_growth ?? "—"}, Chronic Absenteeism ${c.chronic_absenteeism ?? "—"}%, Math ${c.math_proficiency ?? "—"}%, Reading ${c.reading_proficiency ?? "—"}%, Graduation ${c.graduation_rate ?? "—"}%
State averages: Academic Achievement ${s.academic_achievement ?? "—"}, Growth ${s.academic_growth ?? "—"}, Chronic Absenteeism ${s.chronic_absenteeism ?? "—"}%, Math ${s.math_proficiency ?? "—"}%, Reading ${s.reading_proficiency ?? "—"}%, Graduation ${s.graduation_rate ?? "—"}%

Return JSON with:
- summary: a 2-3 sentence overall executive summary
- strengths: array of 3-4 specific strength strings (reference exact data points and comparisons)
- areas_for_improvement: array of 3-4 specific weakness strings (reference exact data)
- recommended_actions: array of 3-4 practical recommendation strings based on the data`;

    base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          areas_for_improvement: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "strengths", "areas_for_improvement", "recommended_actions"],
      },
    })
      .then((res) => setAi(res))
      .catch(() => setAi(null))
      .finally(() => setLoading(false));
  }, [school, overall, subject]);

  return { ai, loading };
}