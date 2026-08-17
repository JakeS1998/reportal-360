import React from "react";
import { useOutletContext } from "react-router-dom";
import PlatformAdminManager from "@/components/PlatformAdminManager";
import SchoolUserManager from "@/components/SchoolUserManager";

export default function AdminUsers() {
  const { creds } = useOutletContext();
  return <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10"><div><h1 className="text-2xl font-bold text-slate-900">Administrators & users</h1><p className="mt-1 text-sm text-slate-500">Manage platform administrators and school staff accounts.</p></div><PlatformAdminManager callerCreds={creds} /><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><SchoolUserManager callerCreds={creds} mode="search" roles={["area", "commissioner", "manager", "teacher"]} /></div></div>;
}