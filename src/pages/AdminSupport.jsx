import React from "react";
import { useOutletContext } from "react-router-dom";
import SupportInbox from "@/components/SupportInbox";

export default function AdminSupport() {
  const { creds } = useOutletContext();
  return <div className="mx-auto max-w-6xl p-6 lg:p-10"><h1 className="text-2xl font-bold text-slate-900">Support desk</h1><p className="mt-1 text-sm text-slate-500">Workload-balanced tickets and client response targets.</p><div className="mt-6"><SupportInbox callerCreds={creds} /></div></div>;
}