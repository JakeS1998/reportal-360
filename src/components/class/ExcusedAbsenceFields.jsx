import React from "react";
import { Paperclip } from "lucide-react";

export default function ExcusedAbsenceFields({ detail, disabled, onChange }) {
  return <div className="mt-2 flex flex-wrap items-center gap-2">
    <select value={detail?.reason || ""} disabled={disabled} onChange={(event) => onChange({ ...detail, reason: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
      <option value="">Select evidence type…</option>
      <option>Parent Note</option>
      <option>Medical Note</option>
      <option>Professional Note</option>
    </select>
    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
      <Paperclip className="h-3.5 w-3.5" />{detail?.file?.name || detail?.fileName || "Attach note"}
      <input type="file" accept="image/*,.pdf" capture="environment" disabled={disabled} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onChange({ ...detail, file, fileName: file.name }); }} />
    </label>
  </div>;
}