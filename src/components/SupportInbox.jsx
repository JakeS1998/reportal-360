import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LifeBuoy, RefreshCw } from "lucide-react";
import SupportRequestItem from "@/components/SupportRequestItem";

const OUTLOOK_CONNECTOR_ID = "6a8315682b9286e588aab2e1";

export default function SupportInbox({ callerCreds }) {
  const [requests, setRequests] = useState([]), [administrators, setAdministrators] = useState([]), [loading, setLoading] = useState(true);
  const loadRequests = async () => { setLoading(true); const result = await base44.functions.invoke("manageStaffMessages", { action: "support_inbox", ...callerCreds }); setRequests(result.data?.requests || []); setAdministrators(result.data?.administrators || []); setLoading(false); };
  useEffect(() => { loadRequests(); }, []);
  return <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50"><LifeBuoy className="h-4 w-4 text-rose-700" /></div><div><h3 className="text-sm font-semibold text-slate-900">Support requests</h3><p className="text-xs text-slate-500">Oldest requests first · automatically assigned by active workload</p></div></div><Button size="sm" variant="outline" onClick={loadRequests} disabled={loading}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button></div><div className="mt-5 max-h-[720px] space-y-3 overflow-auto">{loading ? <p className="text-sm text-slate-400">Loading support requests…</p> : requests.length ? requests.map((request) => <SupportRequestItem key={request.id} request={request} administrators={administrators} callerCreds={callerCreds} onUpdated={loadRequests} />) : <p className="text-sm text-slate-400">No support requests yet.</p>}</div></div>;
}