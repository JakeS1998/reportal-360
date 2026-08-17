import React from "react";
import { useOutletContext } from "react-router-dom";
import SchoolAccessManager from "@/components/SchoolAccessManager";
import SchoolAccessAuditDialog from "@/components/SchoolAccessAuditDialog";

export default function AdminAccess() {
  const { session, creds } = useOutletContext();
  return <div className="mx-auto max-w-4xl space-y-4 p-6 lg:p-10"><div><h1 className="text-2xl font-bold text-slate-900">School access</h1><p className="mt-1 text-sm text-slate-500">Request verified, audited access to a school workspace.</p></div><SchoolAccessManager callerCreds={creds} adminUser={session.user} /><SchoolAccessAuditDialog callerCreds={creds} /></div>;
}