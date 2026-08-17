import React from "react";
import { useOutletContext } from "react-router-dom";
import ClientManagement from "@/components/ClientManagement";

export default function AdminClients() {
  const { creds } = useOutletContext();
  return <div className="mx-auto max-w-6xl p-6 lg:p-10"><h1 className="text-2xl font-bold text-slate-900">Clients</h1><p className="mt-1 text-sm text-slate-500">Contracts, contacts, renewals, and support service levels.</p><div className="mt-6"><ClientManagement callerCreds={creds} /></div></div>;
}