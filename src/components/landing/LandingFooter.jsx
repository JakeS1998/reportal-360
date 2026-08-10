import React from "react";
import { Link } from "react-router-dom";
import LogoLanding from "@/components/LogoLanding";
import AlabamaOutline from "@/components/AlabamaOutline";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

export default function LandingFooter() {
  return (
    <footer className="pt-16 pb-10" style={{ backgroundColor: NAVY }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 pb-10 border-b border-white/10">
          <div className="md:col-span-2">
            <div className="bg-black rounded-xl p-2.5 ring-1 ring-white/10 mb-4 inline-flex">
              <LogoLanding className="h-11 w-auto" />
            </div>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              A centralized insight dashboard for Alabama schools — extracting
              performance metrics directly from ALSDE data for commissioners,
              principals, and teachers.
            </p>
            <p className="mt-4 text-xs text-white/40 flex items-center gap-1.5">
              <AlabamaOutline className="w-3.5 h-3.5" style={{ color: CRIMSON }} />
              Supporting Alabama Schools
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-4">Platform</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="text-white/70 hover:text-white">Features</a></li>
              <li><a href="#pricing" className="text-white/70 hover:text-white">Pricing</a></li>
              <li><Link to="/security" className="text-white/70 hover:text-white">Security</Link></li>
              <li><Link to="/login" className="text-white/70 hover:text-white">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-4">Company</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href="https://www.blueridgegroup.org" target="_blank" rel="noreferrer" className="text-white/70 hover:text-white">Blueridge Group</a></li>
              <li><a href="#contact" className="text-white/70 hover:text-white">Contact</a></li>
              <li><Link to="/privacy" className="text-white/70 hover:text-white">Privacy</Link></li>
              <li><Link to="/terms" className="text-white/70 hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>© {new Date().getFullYear()} ReportAL 360 by Blueridge Group</span>
          <span>FY 2025 · Alabama State Data</span>
        </div>
      </div>
    </footer>
  );
}