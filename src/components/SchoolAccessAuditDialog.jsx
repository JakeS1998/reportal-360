import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Download } from "lucide-react";

const matches = (value, search) => !search || (value || "").toLowerCase().includes(search.toLowerCase());

export default function SchoolAccessAuditDialog({ callerCreds }) {
  const [open, setOpen] = useState(false); const [entries, setEntries] = useState([]);
  const [school, setSchool] = useState(""); const [system, setSystem] = useState(""); const [administrator, setAdministrator] = useState("");
  useEffect(() => { if (open) base44.functions.invoke("manageSchoolStaff", { action: "list_school_access_audit", ...callerCreds }).then((res) => setEntries(res.data?.activity || [])); }, [open]);
  const filteredEntries = useMemo(() => entries.filter((entry) => matches(entry.school_code, school) && matches(entry.system_code, system) && matches(entry.username, administrator)), [entries, school, system, administrator]);
  const exportReport = () => {
    const headers = ["Date", "Administrator", "System", "School", "Authorized By", "Details"];
    const rows = filteredEntries.map((entry) => [new Date(entry.created_date).toLocaleString(), entry.username, entry.system_code, entry.school_code, entry.authorized_by_name || "", entry.details || ""]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "school-access-audit.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><ClipboardCheck className="mr-1 h-4 w-4" />Audit school access</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>School access audit</DialogTitle></DialogHeader><div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><Input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="Filter by school" /><Input value={system} onChange={(event) => setSystem(event.target.value)} placeholder="Filter by system" /><Input value={administrator} onChange={(event) => setAdministrator(event.target.value)} placeholder="Filter by administrator" /></div><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{filteredEntries.length} matching access records</p><Button size="sm" variant="outline" onClick={exportReport} disabled={!filteredEntries.length}><Download className="mr-1 h-4 w-4" />Export CSV</Button></div><div className="max-h-96 space-y-2 overflow-auto">{filteredEntries.length ? filteredEntries.map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{entry.username}</strong><span className="ml-2 text-slate-500">{entry.system_code}-{entry.school_code}</span>{entry.authorized_by_name && <p className="mt-1 text-slate-600">Authorized by <strong>{entry.authorized_by_name}</strong></p>}<p className="mt-1 text-slate-600">{entry.details}</p><p className="mt-1 text-xs text-slate-400">{new Date(entry.created_date).toLocaleString()}</p></div>) : <p className="text-sm text-slate-400">No school access activity matches these filters.</p>}</div></DialogContent></Dialog>;
}