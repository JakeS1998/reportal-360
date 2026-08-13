import React, { useState } from "react";
import { Upload, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";

const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",").map((header) => header.trim().toLowerCase());
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value.trim()])));
};

export default function BulkStaffUpload({ callerCreds, school, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const upload = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const records = parseCsv(await file.text());
      const response = await base44.functions.invoke("manageSchoolStaff", { action: "bulk_create", ...callerCreds, school_code: school.school_code, system_code: school.system_code, school_name: school.school_name, system_name: school.system_name, records });
      setResult(response.data);
      if (response.data?.success) onImported?.();
    } catch (error) {
      setResult({ success: false, error: error.response?.data?.error || "The staff upload could not be completed." });
    } finally {
      setLoading(false);
    }
  };
  const downloadCredentials = () => {
    const rows = [["Full Name", "Username", "Temporary Password"], ...(result?.credentials || []).map((item) => [item.full_name, item.username, item.temp_password])];
    const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "new-staff-credentials.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  const downloadTemplate = () => {
    const blob = new Blob(["full_name,email,role,username,password,subject,room\n"], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "staff-upload-template.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  return <SectionCard title="Bulk Add Staff" subtitle="Upload a CSV to create multiple teacher or school manager accounts" icon={Upload}>
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Use columns: <span className="font-mono">full_name,email,role,username,password,subject,room</span>. Role is optional and defaults to teacher.</p>
      <div className="flex flex-wrap items-center gap-2"><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="text-sm" /><Button onClick={upload} disabled={!file || loading} size="sm">{loading ? "Uploading…" : "Upload staff file"}</Button><Button onClick={downloadTemplate} variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> Download Excel template</Button></div>
      {result && <div className="text-sm"><p className={result.success ? "text-emerald-700" : "text-rose-600"}>{result.success ? `${result.count} account${result.count === 1 ? "" : "s"} created.${result.subjects_created ? ` ${result.subjects_created} subject${result.subjects_created === 1 ? "" : "s"} added.` : ""}${result.rooms_added ? ` ${result.rooms_added} room assignment${result.rooms_added === 1 ? "" : "s"} added.` : ""}` : result.error}</p>{result.errors?.length > 0 && <p className="text-rose-600 mt-1">Skipped: {result.errors.join(" · ")}</p>}{result.credentials?.length > 0 && <Button onClick={downloadCredentials} variant="outline" size="sm" className="mt-2"><Download className="w-3.5 h-3.5 mr-1" /> Download credentials</Button>}</div>}
    </div>
  </SectionCard>;
}