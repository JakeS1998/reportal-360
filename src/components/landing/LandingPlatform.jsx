import React from "react";
import { Database, RefreshCw, Lock } from "lucide-react";

const CRIMSON = "#9E1B32";

const PILLARS = [
  {
    icon: Database,
    title: "Direct ALSDE Integration",
    desc: "Report-card supporting data is parsed straight from official ALSDE sources — graduation rates, proficiency, and demographics stay current without manual entry.",
  },
  {
    icon: RefreshCw,
    title: "Always the Latest Year",
    desc: "Dashboards surface the most recent report year automatically, with historical sparklines for context.",
  },
  {
    icon: Lock,
    title: "Tiered, Role-Based Access",
    desc: "Commissioners, principals, and teachers each see exactly what their role permits — enforced server-side, not just in the UI.",
  },
];

export default function LandingPlatform() {
  return (
    <section id="platform" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80"
              alt="School data workspace"
              className="w-full h-[440px] object-cover"
            />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: CRIMSON }}>
            How it works
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Official data, automatically kept fresh.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            ReportAL 360 pulls directly from Alabama State Department of
            Education report-card datasets and layers classroom workflows on
            top — so leadership and teachers work from identical numbers.
          </p>
          <div className="mt-8 space-y-6">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div
                  className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${CRIMSON}12` }}
                >
                  <p.icon className="w-5 h-5" style={{ color: CRIMSON }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}