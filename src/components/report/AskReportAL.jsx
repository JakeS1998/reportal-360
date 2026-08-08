import React, { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
      setAnswer(response.data?.success ? response.data : { error: response.data?.error || "Al could not generate an answer." });
    } catch (error) {
      setAnswer({ error: error.response?.data?.error || error.message || "Al could not generate an answer." });
    } finally { setLoading(false); }
  };
  return (
    <Dialog>
      <DialogTrigger asChild><button className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[70] w-14 h-14 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 flex items-center justify-center" title="Ask Al" aria-label="Ask Al"><Sparkles className="w-6 h-6" /></button></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Ask <span className="font-mono">Al</span></DialogTitle><DialogDescription>Answers are grounded in your authorised school data.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2">{prompts.map((item) => <button key={item} onClick={() => setQuestion(item)} className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-slate-100">{item}</button>)}</div>
        <div className="flex gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about attendance, attainment, or student progress…" rows={3} className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" /><button onClick={ask} disabled={loading || !question.trim()} className="self-end inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"><Send className="w-4 h-4" />{loading ? "Analysing…" : "Ask"}</button></div>
        {answer && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="text-slate-800 whitespace-pre-wrap">{answer.answer || answer.error}</p>{answer.caveat && <p className="mt-2 text-xs text-amber-700">{answer.caveat}</p>}{answer.evidence?.length > 0 && <p className="mt-3 text-xs text-slate-500">Evidence: {answer.evidence.map((student) => student.student_name).join(", ")}</p>}{answer.sources && <p className="mt-2 text-xs font-medium text-slate-500">Data sources: {answer.sources.join(" · ")}</p>}</div>}
      </DialogContent>
    </Dialog>
  );
}