import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";

export default function SubmissionDialog({ assignment, user, onOpenChange, onSaved }) {
  const [file, setFile] = useState(null); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async () => { setError(""); if (!file) { setError("Choose a document to upload."); return; } setSaving(true); try { const upload = await base44.integrations.Core.UploadFile({ file }); const res = await base44.functions.invoke("manageAssignments", { action: "submit", caller_username: user.username, caller_password: user.password || localStorage.getItem("userPassword") || "", assignment_id: assignment.id, file_url: upload.file_url, file_name: file.name }); if (!res.data?.success) throw new Error(res.data?.error); onSaved(); onOpenChange(false); } catch (e) { setError(e.message || "Unable to submit assignment"); } finally { setSaving(false); } };
  return <Dialog open={!!assignment} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Submit: {assignment?.title}</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="text-sm font-medium text-slate-700">Upload assignment document</label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1.5" /></div><p className="text-xs text-slate-500">Your uploaded document is reviewed for a similarity-risk estimate. This is not a definitive plagiarism finding.</p>{error && <p className="text-sm text-rose-600">{error}</p>}<Button onClick={submit} disabled={saving} className="w-full"> <Upload className="w-4 h-4 mr-1.5" />{saving ? "Checking and submitting…" : "Submit assignment"}</Button></div></DialogContent></Dialog>;
}