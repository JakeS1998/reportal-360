import React from "react";
import { Link } from "react-router-dom";
import LogoLanding from "@/components/LogoLanding";

export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="ReportAL 360 home"><LogoLanding className="h-10 w-auto" /></Link>
          <Link to="/" className="text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground">Back to home</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <p className="text-sm font-semibold text-destructive uppercase tracking-wider">ReportAL 360</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-heading font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-12 space-y-9 text-muted-foreground leading-7">{children}</div>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} ReportAL 360 by Blueridge Group</footer>
    </div>
  );
}