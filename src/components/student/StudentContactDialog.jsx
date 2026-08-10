import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const emptyContact = { name: "", relationship: "", phone: "", email: "" };
const emptyPickup = { name: "", relationship: "", phone: "" };

function ContactRows({ title, rows, template, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  return <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><Button size="sm" variant="outline" onClick={() => onChange([...rows, { ...template }])}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button></div><div className="space-y-2">{rows.map((row, index) => <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4"><Input placeholder="Name" value={row.name || ""} onChange={(event) => update(index, "name", event.target.value)} /><Input placeholder="Relationship" value={row.relationship || ""} onChange={(event) => update(index, "relationship", event.target.value)} /><Input placeholder="Phone" value={row.phone || ""} onChange={(event) => update(index, "phone", event.target.value)} />{"email" in template && <Input placeholder="Email" value={row.email || ""} onChange={(event) => update(index, "email", event.target.value)} />}<Button size="icon" variant="ghost" className="sm:col-start-4" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4 text-rose-500" /></Button></div>)}{rows.length === 0 && <p className="text-sm text-slate-400">No contacts added.</p>}</div></section>;
}

export default function StudentContactDialog({ open, onOpenChange, student, user, onSaved }) {
  const [contacts, setContacts] = useState([]), [pickups, setPickups] = useState([]), [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (open) { setContacts(student?.emergency_contacts || []); setPickups(student?.authorized_pickups || []); setError(""); } }, [open, student]);
  const save = async () => { setSaving(true); setError(""); const res = await base44.functions.invoke("manageStudents", { action: "update", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), student_id: student.id, data: { emergency_contacts: contacts.filter((contact) => contact.name), authorized_pickups: pickups.filter((pickup) => pickup.name) } }); setSaving(false); if (res.data?.success) { onSaved(res.data.student); onOpenChange(false); } else setError(res.data?.error || "Contact information could not be saved."); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add or edit contact information</DialogTitle></DialogHeader><div className="space-y-6"><ContactRows title="Emergency contacts" rows={contacts} template={emptyContact} onChange={setContacts} /><ContactRows title="Authorised pickups" rows={pickups} template={emptyPickup} onChange={setPickups} /></div>{error && <p className="text-sm text-rose-600">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save contact information"}</Button></DialogFooter></DialogContent></Dialog>;
}