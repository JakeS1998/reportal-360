import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function AccountDeletionRequest({ credentials }) {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestDeletion = async () => {
    if (!window.confirm("Send an account deletion request to your school managers?")) return;
    setSubmitting(true);
    const response = await base44.functions.invoke("manageAccountDeletionRequests", { action: "request", ...credentials });
    setStatus(response.data?.success ? "Your deletion request has been sent to your school managers." : response.data?.error || "Unable to send your request.");
    setSubmitting(false);
  };

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div className="flex-1">
          <h2 className="font-semibold text-rose-950">Danger zone</h2>
          <p className="mt-1 text-sm text-rose-800">Request permanent deletion of your account. A school manager must approve this request.</p>
          {status && <p className="mt-3 text-sm font-medium text-rose-800">{status}</p>}
          <Button type="button" variant="destructive" className="mt-4" disabled={submitting} onClick={requestDeletion}>
            {submitting ? "Sending request..." : "Request deletion"}
          </Button>
        </div>
      </div>
    </section>
  );
}