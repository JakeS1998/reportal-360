import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ParentEmailDialog({ open, onOpenChange, student, user }) {
  const contacts = useMemo(() => (student?.emergency_contacts || []).filter((contact) => contact.email), [student]);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    setSending(true); setError("");
    const res = await base44.functions.invoke("manageParentConversations", { action: "start", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), student_id: student.id, recipient_email: recipient, subject, message });
    setSending(false);
    if (res.data?.success) { setRecipient(""); setSubject(""); setMessage(""); onOpenChange(false); } else setError(res.data?.error || "Email could not be sent.");
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Email {student?.student_name}'s parent or guardian</DialogTitle></DialogHeader>{contacts.length ? <div className="space-y-4"><div><Label>Recipient</Label><select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Select a contact…</option>{contacts.map((contact) => <option key={contact.email} value={contact.email}>{contact.name || contact.email}{contact.relationship ? ` · ${contact.relationship}` : ""}</option>)}</select></div><div><Label>Subject</Label><Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} /></div><div><Label>Message</Label><Textarea className="mt-1 min-h-32" value={message} onChange={(e) => setMessage(e.target.value)} /></div>{error && <p className="text-sm text-rose-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={sending || !recipient || !subject.trim() || !message.trim()} onClick={send}>{sending ? "Sending…" : "Send Email"}</Button></DialogFooter></div> : <p className="text-sm text-slate-500">Add an emergency contact email to this student’s profile before sending a message.</p>}</DialogContent></Dialog>;
}