import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function NotificationSettings({ user, credentials, onSaved }) {
  const [settings, setSettings] = useState({ email_notifications: user?.email_notifications !== false, message_notifications: user?.message_notifications !== false, training_reminders: user?.training_reminders !== false });
  const toggle = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const save = async () => { const response = await base44.functions.invoke("manageSchoolStaff", { action: "update_self_settings", ...settings, ...credentials }); if (response.data?.success) onSaved(response.data.user); };
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Notification preferences</h2><div className="mt-4 space-y-3">{[["email_notifications", "Email notifications"], ["message_notifications", "New message alerts"], ["training_reminders", "Training reminders"]].map(([key, label]) => <label key={key} className="flex items-center justify-between text-sm text-slate-700"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={() => toggle(key)} /></label>)}</div><Button className="mt-5" size="sm" onClick={save}>Save preferences</Button></section>;
}