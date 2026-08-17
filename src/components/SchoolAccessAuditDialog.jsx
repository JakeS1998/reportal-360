import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";

export default function SchoolAccessAuditDialog({ callerCreds }) {
  const [open, setOpen] = useState(false); const [entries, setEntries] = useState([]);
  useEffect(() => { if (open) base44.functions.invoke("manageSchoolStaff", { action: "list_school_access_audit", ...callerCreds }).then((res) => setEntries(res.data?.activity || [])); }, [open]);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><ClipboardCheck className="mr-1 h-4 w-4" />Audit school access</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>School access audit</DialogTitle></DialogHeader><div className="max-h-96 space-y-2 overflow-auto">{entries.length ? entries.map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{entry.username}</strong><span className="ml-2 text-slate-500">{entry.system_code}-{entry.school_code}</span><p className="mt-1 text-slate-600">{entry.details}</p><p className="mt-1 text-xs text-slate-400">{new Date(entry.created_date).toLocaleString()}</p></div>) : <p className="text-sm text-slate-400">No school access activity recorded.</p>}</div></DialogContent></Dialog>;
}