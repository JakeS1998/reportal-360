import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import EmailGroupSelector from "@/components/EmailGroupSelector";
import { Mail, Send } from "lucide-react";

export default function MassEmailComposer({ callerCreds }) {
  const [groups, setGroups] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const sendEmail = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const response = await base44.functions.invoke("manageSchoolStaff", {
        action: "send_mass_email",
        ...callerCreds,
        groups,
        subject,
        message,
      });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to send email");
      setStatus({ type: "success", text: `Email sent to ${response.data.sent_count} recipient${response.data.sent_count === 1 ? "" : "s"}.` });
      setGroups([]);
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus({ type: "error", text: error.message || "Unable to send email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <SectionCard title="Mass Email" subtitle="Send a branded message to selected user groups" icon={Mail}>
      <form onSubmit={sendEmail} className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Recipients</Label>
          <div className="mt-2"><EmailGroupSelector selectedGroups={groups} onChange={setGroups} /></div>
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Subject</Label>
          <Input required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1" placeholder="Email subject" />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Message</Label>
          <textarea required value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 flex min-h-32 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Write your plain-text message…" />
          <p className="mt-1 text-xs text-slate-400">Your text will be formatted in the ReportAL 360 email design.</p>
        </div>
        {status && <p className={`text-sm ${status.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{status.text}</p>}
        <Button type="submit" disabled={sending || groups.length === 0} className="bg-slate-900 hover:bg-slate-800">
          {sending ? "Sending..." : "Send Email"}<Send className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </SectionCard>
  );
}