import React from "react";
import AdminManagementDialog from "@/components/AdminManagementDialog";

export default function PlatformAdminRow({ admin, callerCreds, onUpdated }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><div className="text-sm text-slate-700"><strong>{admin.full_name}</strong><span className="ml-2 text-slate-400">{admin.username}</span><span className="ml-2 text-slate-500">{admin.email?.endsWith("@local.reportal360") ? "No SSO email" : admin.email}</span></div><AdminManagementDialog admin={admin} callerCreds={callerCreds} onUpdated={onUpdated} /></div>;
}