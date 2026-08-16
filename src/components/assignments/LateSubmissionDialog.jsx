import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import NativeDeviceFileButton from "@/components/mobile/NativeDeviceFileButton";

export default function LateSubmissionDialog({ submission, credentials, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const upload = async () => {
    if (!file) { setError("Choose the student's assignment file."); return; }
    setSaving(true); setError("");
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke("manageAssignments", { action: "teacher_late_submit", submission_id: submission.id, file_url: result.file_url, file_name: file.name, ...credentials });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to upload");
      onSaved(); onClose();
    } catch (err) { setError(err.message || "Unable to upload"); } finally { setSaving(false); }
  };
  return <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Upload late work for {submission?.student_name}</DialogTitle></DialogHeader><div className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /><NativeDeviceFileButton onFile={setFile} /></div>{error && <p className="text-sm text-rose-600">{error}</p>}<Button onClick={upload} disabled={saving} className="w-full"><Upload className="mr-1.5 h-4 w-4" />{saving ? "Uploading…" : "Mark as late submission"}</Button></div></DialogContent></Dialog>;
}