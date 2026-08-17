import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import StaffChatWorkspace from "@/components/messages/StaffChatWorkspace";

export default function Messages() {
  const { user, school } = useSchool();
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Messages</h1><p className="mt-1 text-sm text-slate-500">Chat privately with colleagues.</p></div><StaffChatWorkspace user={user} schoolCode={school?.school_code} /></div>;
}