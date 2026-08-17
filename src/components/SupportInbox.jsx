import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LifeBuoy, RefreshCw } from "lucide-react";

export default function SupportInbox({ callerCreds }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadRequests = async () => {
    setLoading(true);
    const result = await base44.functions.invoke("manageStaffMessages", { action: "support_inbox", ...callerCreds });
    setRequests(result.data?.requests || []);
    setLoading(false);
  };
  useEffect(() => { loadRequests(); }, []);
  return <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50"><LifeBuoy className="h-4 w-4 text-rose-700" /></div><div><h3 className="text-sm font-semibold text-slate-900">Support requests</h3><p className="text-xs text-slate-500">Teacher requests submitted from Messages</p></div></div><Button size="sm" variant="outline" onClick={loadRequests} disabled={loading}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button></div>
    <div className="mt-5 max-h-80 space-y-3 overflow-auto">{loading ? <p className="text-sm text-slate-400">Loading support requests…</p> : requests.length ? requests.map((request) => <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{request.sender_name}</p><p className="text-xs text-slate-500">{request.system_code ? `${request.system_code} · ` : ""}{request.school_code} · {new Date(request.created_date).toLocaleString()}</p></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.content}</p><p className="mt-2 text-xs text-slate-500">Reported from: {request.current_path || "Unknown screen"}</p></div>) : <p className="text-sm text-slate-400">No support requests yet.</p>}</div>
  </div>;
}