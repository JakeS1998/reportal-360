import React, { useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";

const listText = (items, formatter) => items?.length ? items.map(formatter).filter(Boolean).join(" · ") : "Not recorded";

export default function StudentSensitiveProfile({ student }) {
  const [revealed, setRevealed] = useState(false);
  const contacts = listText(student.emergency_contacts, (c) => [c.name, c.relationship, c.phone, c.email].filter(Boolean).join(" · "));
  const pickups = listText(student.authorized_pickups, (p) => [p.name, p.relationship, p.phone].filter(Boolean).join(" · "));
  const fields = [
    ["Allergies", listText(student.allergies, (item) => item)],
    ["Medications", listText(student.medications, (item) => item)],
    ["Medical notes", student.medical_notes || "Not recorded"],
    ["Dietary requirements", student.dietary_requirements || "Not recorded"],
    ["504 plan", student.section_504_plan ? "Plan on file" : "No plan recorded"],
    ["504 details", student.section_504_details || "Not recorded"],
    ["IEP", student.iep_on_file ? "Plan on file" : "No plan recorded"],
    ["IEP details", student.iep_details || "Not recorded"],
    ["Emergency contacts", contacts],
    ["Authorized pickups", pickups],
    ["Custody or release alerts", student.custody_alerts || "Not recorded"],
  ];

  return <SectionCard title="Protected Student Information" icon={ShieldAlert} action={<Button variant="outline" size="sm" onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{revealed ? "Hide" : "Reveal"}</Button>}>
    <p className="mb-4 text-xs text-slate-400">Sensitive health, accommodation, contact, and release information.</p>
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 transition ${revealed ? "" : "blur-md select-none pointer-events-none"}`} aria-hidden={!revealed}>
      {fields.map(([label, value]) => <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-700 whitespace-pre-wrap">{value}</p></div>)}
    </div>
  </SectionCard>;
}