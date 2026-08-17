import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload } from "lucide-react";

export default function StudentSupportPlansEditor({ plans = [], onChange }) {
  const [title, setTitle] = useState(""); const [file, setFile] = useState(null); const [uploading, setUploading] = useState(false);
  const addPlan = async () => { if (!title.trim() || !file) return; setUploading(true); const upload = await base44.integrations.Core.UploadFile({ file }); onChange([...plans, { title: title.trim(), file_url: upload.file_url, file_name: file.name }]); setTitle(""); setFile(null); setUploading(false); };
  return <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4"><div><Label>Support plans</Label><p className="mt-1 text-xs text-slate-500">Add a named support plan for teachers to view.</p></div>{plans.length > 0 && <div className="mt-3 space-y-2">{plans.map((plan, index) => <div key={`${plan.file_url}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm"><span className="truncate text-slate-700">{plan.title} · {plan.file_name}</span><button type="button" onClick={() => onChange(plans.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>}<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Input placeholder="Plan name" value={title} onChange={(event) => setTitle(event.target.value)} /><Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /><Button type="button" variant="outline" onClick={addPlan} disabled={!title.trim() || !file || uploading}>{uploading ? "Uploading…" : <><Upload className="mr-1 h-4 w-4" />Add plan</>}</Button></div></div>;
}