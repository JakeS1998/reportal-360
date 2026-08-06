import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SchoolProvider, useSchool } from "@/lib/SchoolContext";
import { LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles, LogOut, Building2, ClipboardList, PanelLeftClose, PanelLeftOpen, UserCog, BookOpen, Calendar, UserCheck, UserPlus, Award, BarChart3, MapPin } from "lucide-react";
import AlabamaOutline from "./AlabamaOutline";
import LogoTransparent from "./LogoTransparent";
import FilterBar from "./FilterBar";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

const AL_LANDMARKS = [
  "Big Spring Park · Huntsville",
  "Gulf Shores Coast",
  "Birmingham Skyline",
  "Montgomery Capitol",
  "U.S. Space & Rocket Center",
  "Lake Martin",
  "Mobile Bay",
  "Tuscaloosa",
];

function todayLandmark() {
  return AL_LANDMARKS[new Date().getDate() % AL_LANDMARKS.length];
}

function Shell() {
  const { school, switchSchool, user, isArea, canManageStaff } = useSchool();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const contentRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const nav = [
    { to: "/overview", label: "Executive Overview", icon: LayoutDashboard },
    { to: "/academics", label: "Academic Performance", icon: GraduationCap },
    { to: "/attendance", label: "Attendance & Engagement", icon: CalendarCheck },
    { to: "/demographics", label: "Students & Demographics", icon: Users },
    { to: "/students", label: "Student Roster", icon: ClipboardList },
    { to: "/insights", label: "Predictive Insights", icon: Sparkles },
  ];

  nav.push({ to: "/my-classes", label: "My Classes", icon: BookOpen });
  nav.push({ to: "/training", label: "Training", icon: Award });

  if (canManageStaff) {
    nav.push({ to: "/staff", label: "Admin Panel", icon: UserCog });
    nav.push({ to: "/training-dashboard", label: "Training Dashboard", icon: BarChart3 });
    nav.push({ section: "Class Management" });
    nav.push({ to: "/classes", label: "Classes", icon: BookOpen });
    nav.push({ to: "/academic-years", label: "Academic Years", icon: Calendar });
    nav.push({ to: "/teacher-assignments", label: "Teacher Assignments", icon: UserCheck });
    nav.push({ to: "/student-assignments", label: "Student Assignments", icon: UserPlus });
  }

  const roleBadge = user?.role
    ? { area: "Area Access", manager: "Manager", teacher: "Teacher", commissioner: "Area Access", admin: "Admin" }[user.role]
    : "";

  const landmark = todayLandmark();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-[${NAVY}] border-r border-white/10 flex flex-col sticky top-0 h-screen transition-all duration-300`} style={{ backgroundColor: NAVY }}>
        <div className={`${collapsed ? "px-2 justify-center" : "px-5"} py-5 flex items-center gap-3`}>
          {collapsed ? (
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 ring-1 ring-white/10">
              <AlabamaOutline className="w-6 h-6" style={{ color: CRIMSON }} />
            </div>
          ) : (
            <LogoTransparent className="w-full max-w-[180px] shrink-0" />
          )}
        </div>
        {!collapsed && user && (
          <div className="px-5 pb-2">
            <p className="text-xs font-medium text-white/85 truncate">{user.full_name || user.username}</p>
            {roleBadge && <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{roleBadge}</span>}
          </div>
        )}
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
          {nav.map((n, i) => {
            if (n.section) {
              if (collapsed) return null;
              return <p key={i} className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: CRIMSON }}><span className="inline-block w-3 h-px" style={{ backgroundColor: CRIMSON }} />{n.section}</p>;
            }
            return (
              <NavLink
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {!collapsed && isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full" style={{ backgroundColor: CRIMSON }} />}
                    <n.icon className="w-4 h-4 shrink-0" /> {!collapsed && n.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="mx-3 mb-2 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: CRIMSON }}>
              <MapPin className="w-3 h-3" /> Alabama Landmark Today
            </p>
            <p className="text-xs font-medium text-white/85 mt-1 leading-tight">{landmark}</p>
          </div>
        )}

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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: NAVY }}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: CRIMSON }}>
              <AlabamaOutline className="w-3.5 h-3.5" /> ReportAL 360
            </p>
            <h1 className="text-xl font-bold text-white mt-0.5">{school?.school_name || (isArea ? "All Schools" : "—")}</h1>
            <p className="text-xs text-white/60 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3" />
              {school?.system_name || school?.district || "—"}
              <span className="text-white/25">·</span> FY {school?.year || "2025"}
              <span className="text-white/25">·</span> Code {school?.school_code}
              {school?.school_type ? <><span className="text-white/25">·</span>{school.school_type}</> : null}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <FilterBar school={school} contentRef={contentRef} />
          <div ref={contentRef}>
            <Outlet />
          </div>
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