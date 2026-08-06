import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";
import AlabamaOutline from "@/components/AlabamaOutline";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

export default function LandingHero() {
  return (
    <section
      className="relative overflow-hidden pt-32 pb-24"
      style={{ backgroundColor: NAVY }}
    >
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #ffffff 0, transparent 40%), radial-gradient(circle at 80% 70%, #9E1B32 0, transparent 45%)",
        }}
      />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: CRIMSON }} />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/15">
            <AlabamaOutline className="w-3.5 h-3.5" style={{ color: CRIMSON }} />
            Built for Alabama Schools
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            One portal for every{" "}
            <span style={{ color: CRIMSON }}>Alabama school metric</span>.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            ReportAL 360 unifies official ALSDE report-card data with teacher
            schedules, attendance, grading, and compliance training — so
            commissioners, principals, and teachers act on the same numbers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: CRIMSON }}
            >
              View Pricing <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/15 transition-colors"
            >
              Sign In to Portal
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> FERPA-Aware Controls</span>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Live ALSDE Data</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-2 backdrop-blur-sm">
            <div className="rounded-xl overflow-hidden ring-1 ring-white/10">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
                alt="ReportAL 360 dashboard preview"
                className="w-full h-[420px] object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${CRIMSON}15` }}>
              <BarChart3 className="w-5 h-5" style={{ color: CRIMSON }} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Graduation Rate</p>
              <p className="text-lg font-bold text-slate-900">92.4%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}