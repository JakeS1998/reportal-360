import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SectionCard from "./SectionCard";
import Skeleton from "./Skeleton";
import { Sparkles, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";

export default function AiExecutiveSummary({ school, overall, subject }) {
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

  if (loading) {
    return (
      <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </SectionCard>
    );
  }

  if (!ai) {
    return (
      <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
        <p className="text-sm text-slate-400">Summary unavailable.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
      <p className="text-sm text-slate-700 leading-relaxed mb-6">{ai.summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummarySection icon={CheckCircle2} title="Strengths" items={ai.strengths} accent="#10B981" bg="#ECFDF5" />
        <SummarySection icon={AlertCircle} title="Areas for Improvement" items={ai.areas_for_improvement} accent="#F59E0B" bg="#FFFBEB" />
        <SummarySection icon={Lightbulb} title="Recommended Actions" items={ai.recommended_actions} accent="#1D4ED8" bg="#EFF6FF" />
      </div>
    </SectionCard>
  );
}

function SummarySection({ icon: Icon, title, items, accent, bg }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4" style={{ backgroundColor: bg + "50" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <ul className="space-y-2.5">
        {(items || []).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
            {item}
          </li>
        ))}
        {(!items || items.length === 0) && <li className="text-xs text-slate-400">No data available.</li>}
      </ul>
    </div>
  );
}