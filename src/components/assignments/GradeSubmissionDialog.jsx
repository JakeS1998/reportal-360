import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, FileText } from "lucide-react";

export default function GradeSubmissionDialog({ submission, credentials, onClose, onSaved }) {
  const [grade, setGrade] = useState(""); const [letter, setLetter] = useState(""); const [feedback, setFeedback] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { setGrade(submission?.grade_percentage ?? ""); setLetter(submission?.letter_grade || ""); setFeedback(submission?.feedback || ""); }, [submission]);
  const save = async () => { setSaving(true); const res = await base44.functions.invoke("manageAssignments", { action: "grade_submission", submission_id: submission.id, grade_percentage: Number(grade), letter_grade: letter, feedback, ...credentials }); if (res.data?.success) { onSaved(); onClose(); } setSaving(false); };
  return <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{submission?.student_name}'s submission</DialogTitle></DialogHeader><div className="space-y-3 text-sm">{submission?.file_url && <Button asChild variant="outline"><a href={submission.file_url} target="_blank" rel="noreferrer"><FileText className="w-4 h-4" />Download submission <ExternalLink className="w-3.5 h-3.5" /></a></Button>}{submission?.submission_text && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{submission.submission_text}</p>}<div className="grid grid-cols-2 gap-3"><Input type="number" min="0" max="100" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Percentage" /><Input value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Letter grade" /></div><Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback for the student" className="min-h-28" /><Button onClick={save} disabled={saving || grade === ""}>{saving ? "Saving…" : "Save grade"}</Button></div></DialogContent></Dialog>;
}