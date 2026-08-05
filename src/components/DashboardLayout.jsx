import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SchoolProvider, useSchool } from "@/lib/SchoolContext";
import { LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles, LogOut, Building2, ClipboardList } from "lucide-react";
import FilterBar from "./FilterBar";

const nav = [
  { to: "/overview", label: "Executive Overview", icon: LayoutDashboard },
  { to: "/academics", label: "Academic Performance", icon: GraduationCap },
  { to: "/attendance", label: "Attendance & Engagement", icon: CalendarCheck },
  { to: "/demographics", label: "Students & Demographics", icon: Users },
  { to: "/students", label: "Student Roster", icon: ClipboardList },
  { to: "/insights", label: "Predictive Insights", icon: Sparkles },
];

function Shell() {
  const { school, switchSchool } = useSchool();
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1D4ED8] flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-tight">SchoolLens</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Executive Analytics</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={switchSchool}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Switch School
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{school?.school_name || "—"}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3" />
              {school?.system_name || school?.district || "—"}
              <span className="text-slate-300">·</span> FY {school?.year || "2025"}
              <span className="text-slate-300">·</span> Code {school?.school_code}
              {school?.school_type ? <><span className="text-slate-300">·</span>{school.school_type}</> : null}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <FilterBar school={school} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SchoolProvider>
      <Shell />
    </SchoolProvider>
  );
}