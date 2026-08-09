import React, { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { SchoolProvider, useSchool } from "@/lib/SchoolContext";
import { LogOut, Building2, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import AlabamaOutline from "./AlabamaOutline";
import LogoMono from "./LogoMono";
import LandmarkPreview from "./LandmarkPreview";
import FilterBar from "./FilterBar";
import DashboardNav from "./DashboardNav";
import NotificationBell from "./NotificationBell";
import AlertPopup from "./messages/AlertPopup";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

function Shell() {
  const { school, switchSchool, user, isArea, canManageStaff } = useSchool();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const roleBadge = user?.role
    ? { area: "Area Access", manager: "Manager", teacher: "Teacher", commissioner: "Area Access", admin: "Admin" }[user.role]
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} hidden md:flex shrink-0 bg-[${NAVY}] border-r border-white/10 flex-col sticky top-0 h-screen transition-all duration-300`} style={{ backgroundColor: NAVY }}>
        <div className={`${collapsed ? "px-2 justify-center" : "px-5"} py-5 flex items-center gap-3`}>
          {collapsed ? (
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 ring-1 ring-white/10">
              <AlabamaOutline className="w-6 h-6" style={{ color: CRIMSON }} />
            </div>
          ) : (
            <LogoMono className="w-full max-w-[180px] shrink-0 rounded-lg" />
          )}
        </div>
        {!collapsed && user && (
          <div className="px-5 pb-2">
            <p className="text-xs font-medium text-white/85 truncate">{user.full_name || user.username}</p>
            {roleBadge && <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{roleBadge}</span>}
          </div>
        )}
        <DashboardNav collapsed={collapsed} canManageStaff={canManageStaff} />

        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={switchSchool}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4 shrink-0" /> {!collapsed && "Sign Out"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile slide-out drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-screen w-72 flex flex-col border-r border-white/10 shadow-2xl" style={{ backgroundColor: NAVY }}>
            <div className="px-5 py-5 flex items-center justify-between">
              <LogoMono className="w-full max-w-[150px] shrink-0 rounded-lg" />
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {user && (
              <div className="px-5 pb-2">
                <p className="text-xs font-medium text-white/85 truncate">{user.full_name || user.username}</p>
                {roleBadge && <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{roleBadge}</span>}
              </div>
            )}
            <DashboardNav collapsed={false} canManageStaff={canManageStaff} onNavigate={() => setMobileOpen(false)} />
            <div className="p-3 border-t border-white/10 space-y-1">
              <button
                onClick={switchSchool}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 md:px-8 py-4 flex items-center justify-between gap-3 sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-white/80 hover:text-white p-1 -ml-1"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: CRIMSON }}>
                <AlabamaOutline className="w-3.5 h-3.5" /> ReportAL 360
              </p>
              <h1 className="text-base md:text-xl font-bold text-white mt-0.5 truncate">{school?.school_name || (isArea ? "All Schools" : "—")}</h1>
              <p className="text-xs text-white/60 flex items-center gap-1.5 mt-0.5 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{school?.system_name || school?.district || "—"}</span>
                <span className="text-white/25 hidden sm:inline">·</span> <span className="hidden sm:inline">FY {school?.year || "2025"}</span>
                <span className="text-white/25 hidden md:inline">·</span> <span className="hidden md:inline">Code {school?.school_code}</span>
                {school?.school_type ? <><span className="text-white/25 hidden lg:inline">·</span><span className="hidden lg:inline">{school.school_type}</span></> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <LandmarkPreview />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <FilterBar school={school} contentRef={contentRef} />
          <div ref={contentRef}>
            <Outlet />
          </div>
          <AlertPopup />
          <footer className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <AlabamaOutline className="w-4 h-4" style={{ color: CRIMSON }} />
              <span>Supporting Alabama Schools</span>
            </div>
            <span>ReportAL 360 · FY {school?.year || "2025"}</span>
          </footer>
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