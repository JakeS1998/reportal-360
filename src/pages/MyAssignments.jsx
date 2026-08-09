import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SubmissionDialog from "@/components/assignments/SubmissionDialog";
import { ArrowLeft, ClipboardList, Upload } from "lucide-react";

export default function MyAssignments() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (sessionUser) => {
    const res = await base44.functions.invoke("manageAssignments", { action: "student_list", caller_username: sessionUser.username, caller_password: sessionUser.password || localStorage.getItem("userPassword") || "" });
    setAssignments(res.data?.assignments || []);
    setSubmissions(res.data?.submissions || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session?.user || session.user.role !== "student") { navigate("/login", { replace: true }); return; }
    setUser(session.user);
    load(session.user);
  }, [load, navigate]);
  if (!user) return null;
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="px-4 md:px-8 py-4 border-b border-slate-200 bg-white"><Button variant="ghost" size="sm" onClick={() => navigate("/my-student")}><ArrowLeft className="w-4 h-4 mr-1" />Back to portal</Button></header>
    <main className="max-w-4xl mx-auto p-4 md:p-8"><div className="flex items-center gap-3 mb-6"><ClipboardList className="w-6 h-6 text-slate-700" /><div><h1 className="text-xl font-bold text-slate-900">My Assignments</h1><p className="text-sm text-slate-500">Submit work before each deadline.</p></div></div>
      {loading ? <p className="text-sm text-slate-500">Loading assignments…</p> : <div className="space-y-3">{assignments.length === 0 && <p className="rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-500">No assignments have been posted yet.</p>}{assignments.map((assignment) => {
        const submission = submissions.find((item) => item.assignment_id === assignment.id);
        const closed = new Date(assignment.deadline) < new Date() || assignment.status === "closed";
        return <div key={assignment.id} className="rounded-xl bg-white border border-slate-200 p-5"><div className="flex flex-col sm:flex-row justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{assignment.title}</h2><p className="text-sm text-slate-500 mt-1">{assignment.class_name || "Class"} · {assignment.teacher_name}</p>{assignment.instructions && <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{assignment.instructions}</p>}<p className={`text-xs font-medium mt-3 ${closed ? "text-rose-600" : "text-slate-500"}`}>{closed ? "Submissions closed" : `Due ${new Date(assignment.deadline).toLocaleString()}`}</p></div><div className="shrink-0">{submission ? <div className="text-xs rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2">Submitted {new Date(submission.submitted_at).toLocaleString()}<br />{submission.status === "viewed" ? `Viewed by ${(submission.teacher_viewed_by || []).map((viewer) => viewer.teacher_name).join(", ")}` : "Awaiting teacher review"}<br />AI similarity: {submission.plagiarism_score == null ? "Unavailable" : `${submission.plagiarism_score}%`}</div> : !closed && <Button size="sm" onClick={() => setSelected(assignment)}><Upload className="w-4 h-4 mr-1" />Submit</Button>}</div></div></div>;
      })}</div>}
    </main><SubmissionDialog assignment={selected} user={user} onOpenChange={(open) => !open && setSelected(null)} onSaved={() => load(user)} />
  </div>;
}