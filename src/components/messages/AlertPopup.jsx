import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { AlertTriangle, X } from "lucide-react";

export default function AlertPopup() {
  const { user, school } = useSchool();
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    if (!user?.id || !school?.school_code) return;
    const load = async () => { const res = await base44.functions.invoke("manageStaffMessages", { action: "inbox", school_code: school.school_code, caller_username: user.username, caller_password: user.password || localStorage.getItem("userPassword") || "", caller_email: user.email || "", caller_sso: Boolean(user.sso || user.email) }); setAlert((res.data?.messages || []).find((item) => item.type === "alert" && !item.read_at) || null); };
    load(); const timer = setInterval(load, 30000); return () => clearInterval(timer);
  }, [user?.id, school?.school_code]);
  const dismiss = async () => { await base44.functions.invoke("manageStaffMessages", { action: "read", message_id: alert.id, school_code: school.school_code, caller_username: user.username, caller_password: user.password || localStorage.getItem("userPassword") || "", caller_email: user.email || "", caller_sso: Boolean(user.sso || user.email) }); setAlert(null); };
  if (!alert) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-3"><AlertTriangle className="w-6 h-6 text-amber-700" /></div><div className="flex-1"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">School alert</p><h2 className="mt-1 text-xl font-bold text-slate-900">{alert.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{alert.content}</p><p className="mt-4 text-xs text-slate-400">From {alert.sender_name}</p></div><button onClick={dismiss} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button></div><button onClick={dismiss} className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white">Acknowledge</button></div></div>;
}