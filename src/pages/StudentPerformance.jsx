import React, { useMemo } from "react";
import { BookOpen } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import Skeleton from "@/components/Skeleton";
import useStudentPortalData from "@/hooks/useStudentPortalData";

const gradeFor = (score) => score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

export default function StudentPerformance() {
  const { loading, error, profile } = useStudentPortalData();
  const grades = useMemo(() => (profile?.classes || []).map((item) => {
    const scores = (profile?.attainment || []).filter((record) => record.class_id === item.id).map((record) => (record.score / (record.max_score || 100)) * 100);
    const score = scores.length ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length) : null;
    return { item, score, count: scores.length };
  }), [profile]);
  if (loading) return <Skeleton className="h-64 max-w-5xl mx-auto" />;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  return <div className="max-w-5xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-slate-900">My Performance</h1><p className="text-sm text-slate-500">Your average score in each class.</p></div><SectionCard title="Class Grades" subtitle="Based on recorded assessments" icon={BookOpen}>{grades.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2">Class</th><th className="py-2">Subject</th><th className="py-2 text-right">Assessments</th><th className="py-2 text-right">Average</th><th className="py-2 text-center">Grade</th></tr></thead><tbody>{grades.map(({ item, score, count }) => <tr key={item.id} className="border-b border-slate-50"><td className="py-3 font-medium text-slate-800">{item.class_name}</td><td className="py-3 text-slate-600">{item.subject || "—"}</td><td className="py-3 text-right text-slate-500">{count}</td><td className="py-3 text-right font-semibold">{score == null ? "—" : `${score}%`}</td><td className="py-3 text-center">{score != null && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold">{gradeFor(score)}</span>}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-400">No class performance is available yet.</p>}</SectionCard></div>;
}