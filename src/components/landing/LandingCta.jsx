import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AlabamaOutline from "@/components/AlabamaOutline";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

export default function LandingCta() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center"
          style={{ backgroundColor: NAVY }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, #ffffff 0, transparent 40%), radial-gradient(circle at 70% 80%, #9E1B32 0, transparent 45%)",
            }}
          />
          <div className="relative">
            <AlabamaOutline className="w-10 h-10 mx-auto mb-5" style={{ color: CRIMSON }} />
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Bring ReportAL 360 to your school.
            </h2>
            <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
              Join Alabama schools turning state data into daily decisions.
              Set up in minutes — no IT team required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: CRIMSON }}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/15 transition-colors"
              >
                Compare Plans
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}