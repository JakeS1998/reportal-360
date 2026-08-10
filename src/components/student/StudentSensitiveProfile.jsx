import React, { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";

const listText = (items, formatter) => items?.length ? items.map(formatter).filter(Boolean).join(" · ") : "Not recorded";

function PrivateSection({ title, fields }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { if (!revealed) return; const timeout = setTimeout(() => setRevealed(false), 30000); return () => clearTimeout(timeout); }, [revealed]);
  return <SectionCard title={title} icon={ShieldAlert} action={<Button variant="outline" size="sm" onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{revealed ? "Hide" : "Reveal"}</Button>}><div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 ${revealed ? "" : "blur-md select-none pointer-events-none"}`} aria-hidden={!revealed}>{fields.map(([label, value]) => <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-700 whitespace-pre-wrap">{value || "Not recorded"}</p></div>)}</div>{revealed && <p className="mt-4 text-xs text-slate-400">This information will hide automatically in 30 seconds.</p>}</SectionCard>;
}

export default function StudentSensitiveProfile({ student }) {
  const contacts = listText(student.emergency_contacts, (c) => [c.name, c.relationship, c.phone, c.email].filter(Boolean).join(" · "));
  const pickups = listText(student.authorized_pickups, (p) => [p.name, p.relationship, p.phone].filter(Boolean).join(" · "));
  return <div className="grid grid-cols-1 gap-4"><PrivateSection title="Health Information" fields={[["Allergies", listText(student.allergies, (item) => item)], ["Medications", listText(student.medications, (item) => item)], ["Medical notes", student.medical_notes], ["Dietary requirements", student.dietary_requirements]]} /><PrivateSection title="Support Plans" fields={[["504 plan", student.section_504_plan ? "Plan on file" : "No plan recorded"], ["504 details", student.section_504_details], ["IEP", student.iep_on_file ? "Plan on file" : "No plan recorded"], ["IEP details", student.iep_details]]} /><PrivateSection title="Family, Contact & Release" fields={[["Home address", [student.address_line_1, student.address_line_2, student.city, student.state, student.postal_code].filter(Boolean).join(", ")], ["Emergency contacts", contacts], ["Authorized pickups", pickups], ["Custody or release alerts", student.custody_alerts]]} /></div>;
}