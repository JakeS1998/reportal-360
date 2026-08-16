import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";

export default function AccountDeletionRequests({ callerCreds }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  const load = async () => {
    setLoading(true);
    const response = await base44.functions.invoke("manageAccountDeletionRequests", { action: "list", ...callerCreds });
    setRequests(response.data?.requests || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (request) => {
    if (!window.confirm(`Approve deletion for ${request.staff_name}? This cannot be undone.`)) return;
    setProcessingId(request.id);
    const response = await base44.functions.invoke("manageAccountDeletionRequests", { action: "approve", request_id: request.id, ...callerCreds });
    if (!response.data?.success) alert(response.data?.error || "Unable to approve this request.");
    await load();
    setProcessingId("");
  };

  return <SectionCard title="Account deletion requests" subtitle="Approve pending requests from staff" icon={Trash2}>
    {loading ? <p className="text-sm text-slate-400">Loading requests...</p> : requests.length === 0 ? <p className="text-sm text-slate-400">No pending deletion requests.</p> : <div className="space-y-2">{requests.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{request.staff_name}</p><p className="text-xs text-slate-500">{request.username} · Requested {new Date(request.created_date).toLocaleDateString()}</p></div><Button size="sm" variant="destructive" disabled={processingId === request.id} onClick={() => approve(request)}>{processingId === request.id ? "Approving..." : "Approve deletion"}</Button></div>)}</div>}
  </SectionCard>;
}