import React from "react";
import { ClipboardCheck, Eye, LockKeyhole, ShieldCheck } from "lucide-react";

const safeguards = [
  { icon: LockKeyhole, title: "Role-based access", text: "Staff access is limited by role and school scope." },
  { icon: Eye, title: "Accountability", text: "Sensitive activity can be recorded for review." },
  { icon: ClipboardCheck, title: "Local oversight", text: "Schools maintain control of users and permissions." },
];

export default function FerpaAlignmentVisual() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-primary p-3 text-primary-foreground"><ShieldCheck className="w-6 h-6" /></div>
        <div><p className="text-sm font-semibold text-destructive uppercase tracking-wider">FERPA alignment</p><h2 className="mt-1 text-2xl font-heading font-semibold text-card-foreground">Privacy controls that support responsible education data use</h2></div>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {safeguards.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl bg-muted p-5"><Icon className="w-5 h-5 text-foreground" /><h3 className="mt-4 font-semibold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}
      </div>
      <p className="mt-6 text-sm leading-6 text-muted-foreground">ReportAL 360 is designed to support—not replace—each school or district’s own FERPA compliance programme, policies, and procedures.</p>
    </section>
  );
}