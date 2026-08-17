import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import SchoolBrandingSettings from "@/components/account/SchoolBrandingSettings";

export default function SchoolBranding() {
  const { user, school, isManager, updateSchoolBranding } = useSchool();
  const credentials = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email) };
  if (!isManager) return <div><h1 className="text-xl font-bold text-slate-900">School branding</h1><p className="mt-2 text-sm text-slate-500">School manager access is required.</p></div>;
  return <div className="max-w-3xl"><div className="mb-5"><h1 className="text-xl font-bold text-slate-900">School branding</h1><p className="text-sm text-slate-500">Manage the identity shown across your school workspace.</p></div><SchoolBrandingSettings school={school} credentials={credentials} onSaved={updateSchoolBranding} /></div>;
}