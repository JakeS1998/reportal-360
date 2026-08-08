import React, { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/SectionCard";

const prompts = ["Which students have declining performance and attendance below 90%?", "Which grade has improved the most this year?", "Why has chronic absenteeism increased?"];

export default function AskReportAL({ user }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true); setAnswer(null);
    try {
      const response = await base44.functions.invoke("askReportAL", { question, school_code: user.school_code, caller_username: user.username, caller_password: user.password || localStorage.getItem("userPassword") || "" });
      setAnswer(response.data);
    } finally { setLoading(false); }
  };
  return <SectionCard title="Ask ReportAL" subtitle="Answers are grounded in your authorised school data." icon={Sparkles}>
    <div className="flex flex-wrap gap-2 mb-3">{prompts.map((item) => <button key={item} onClick={() => setQuestion(item)} className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-slate-100">{item}</button>)}</div>
    <div className="flex gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about attendance, attainment, or student progress…" rows={2} className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" /><button onClick={ask} disabled={loading || !question.trim()} className="self-end inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"><Send className="w-4 h-4" />{loading ? "Analysing…" : "Ask"}</button></div>
    {answer && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="text-slate-800 whitespace-pre-wrap">{answer.answer || answer.error}</p>{answer.caveat && <p className="mt-2 text-xs text-amber-700">{answer.caveat}</p>}{answer.evidence?.length > 0 && <p className="mt-3 text-xs text-slate-500">Evidence: {answer.evidence.map((student) => student.student_name).join(", ")}</p>}{answer.sources && <p className="mt-2 text-xs font-medium text-slate-500">Data sources: {answer.sources.join(" · ")}</p>}</div>}
  </SectionCard>;
}