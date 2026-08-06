import React from "react";
import { ShieldCheck, Lock, FileCheck, KeyRound } from "lucide-react";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

const ITEMS = [
  { icon: ShieldCheck, title: "FERPA-Aware Controls", desc: "Student data protected with role-based access enforced server-side." },
  { icon: KeyRound, title: "MFA & SSO", desc: "Microsoft Entra single sign-on with multi-factor authentication." },
  { icon: FileCheck, title: "Full Audit Trail", desc: "Every view, edit, and export logged for compliance review." },
  { icon: Lock, title: "Encrypted at Rest", desc: "Records secured with platform-grade encryption and access controls." },
];

export default function LandingSecurity() {
  return (
    <section id="security" className="py-24" style={{ backgroundColor: NAVY }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: CRIMSON }}>
            Trust & Security
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">
            Student data protected by design.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            ReportAL 360 was built for Alabama school staff who handle sensitive
            records. Security isn't an add-on — it's the foundation.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {ITEMS.map((it) => (
              <div key={it.title} className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <it.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{it.title}</h3>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">{it.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CRIMSON}25` }}>
                <ShieldCheck className="w-6 h-6" style={{ color: CRIMSON }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Compliance Scorecard</p>
                <p className="text-xs text-white/50">Live security posture</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Access Controls", value: 100 },
                { label: "Audit Coverage", value: 98 },
                { label: "Training Compliance", value: 94 },
                { label: "MFA Adoption", value: 96 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/70">{row.label}</span>
                    <span className="text-white font-semibold">{row.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.value}%`, backgroundColor: CRIMSON }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}