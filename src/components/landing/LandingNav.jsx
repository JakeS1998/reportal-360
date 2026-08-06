import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LogoLanding from "@/components/LogoLanding";

const BLACK = "#000000";
const CRIMSON = "#9E1B32";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Platform", href: "#platform" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Security", href: "#security" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "shadow-lg border-b border-white/10" : ""}`}
      style={{ backgroundColor: BLACK }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <LogoLanding className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white px-4 py-2">
            Sign In
          </Link>
          <a
            href="#pricing"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: CRIMSON }}
          >
            Get Started
          </a>
        </div>

        <button onClick={() => setOpen((o) => !o)} className="md:hidden p-2 text-white/80">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 space-y-3" style={{ backgroundColor: BLACK }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-white/70 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <Link to="/login" className="block text-sm font-medium text-white/70">Sign In</Link>
        </div>
      )}
    </header>
  );
}