import React, { useState } from "react";
import { useSchool } from "@/lib/SchoolContext";
import ProfilePhotoSettings from "@/components/account/ProfilePhotoSettings";
import NotificationSettings from "@/components/account/NotificationSettings";
import PasswordSettings from "@/components/account/PasswordSettings";
import AccountDeletionRequest from "@/components/account/AccountDeletionRequest";
import SchoolBrandingSettings from "@/components/account/SchoolBrandingSettings";

export default function AccountSettings() {
  const { user, school, isManager, updateSchoolBranding } = useSchool(); const [account, setAccount] = useState(user);
  const credentials = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email) };
  const saved = (updated) => { setAccount(updated); const session = JSON.parse(localStorage.getItem("userSession") || "{}"); localStorage.setItem("userSession", JSON.stringify({ ...session, user: { ...session.user, ...updated } })); };
  return <div className="max-w-3xl space-y-5"><div><h1 className="text-xl font-bold text-slate-900">Account settings</h1><p className="text-sm text-slate-500">Manage your profile picture, notification preferences, and password.</p></div><ProfilePhotoSettings user={account} credentials={credentials} onSaved={saved} /><NotificationSettings user={account} credentials={credentials} onSaved={saved} /><PasswordSettings user={account} />{isManager && <SchoolBrandingSettings school={school} credentials={credentials} onSaved={updateSchoolBranding} />}<AccountDeletionRequest credentials={credentials} /></div>;
}