import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SchoolProvider, useSchool } from "@/lib/SchoolContext";
import { LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles, LogOut, Building2, ClipboardList, PanelLeftClose, PanelLeftOpen, UserCog, BookOpen, Calendar, UserCheck, UserPlus, Award, BarChart3, ChevronDown } from "lucide-react";
import AlabamaOutline from "./AlabamaOutline";
import LogoMono from "./LogoMono";
import LandmarkPreview from "./LandmarkPreview";
import FilterBar from "./FilterBar";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

function Shell() {
  const { school, switchSchool, user, isArea, canManageStaff } = useSchool();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const contentRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-groups");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (openGroups) localStorage.setItem("sidebar-groups", JSON.stringify(openGroups));
  }, [openGroups]);

  const navGroups = [
    {
      heading: "Insights",
      items: [
        { to: "/overview", label: "Executive Overview", icon: LayoutDashboard },
        { to: "/academics", label: "Academic Performance", icon: GraduationCap },
        { to: "/attendance", label: "Attendance & Engagement", icon: CalendarCheck },
        { to: "/demographics", label: "Students & Demographics", icon: Users },
        { to: "/insights", label: "Predictive Insights", icon: Sparkles },
      ],
    },
    {
      heading: "Students",
      items: [
        { to: "/students", label: "Student Roster", icon: ClipboardList },
      ],
    },
    {
      heading: "Classroom",
      items: [
        { to: "/my-classes", label: "My Classes", icon: BookOpen },
        { to: "/training", label: "Training", icon: Award },
      ],
    },
  ];

  if (canManageStaff) {
    navGroups.push({
      heading: "Administration",
      items: [
        { to: "/staff", label: "Admin Panel", icon: UserCog },
        { to: "/training-dashboard", label: "Training Dashboard", icon: BarChart3 },
        { to: "/classes", label: "Classes", icon: BookOpen },
        { to: "/academic-years", label: "Academic Years", icon: Calendar },
        { to: "/teacher-assignments", label: "Teacher Assignments", icon: UserCheck },
        { to: "/student-assignments", label: "Student Assignments", icon: UserPlus },
      ],
    });
  }

  const isGroupOpen = (heading) =>
    openGroups === null ? true : !!openGroups[heading];

  const toggleGroup = (heading) =>
    setOpenGroups((g) => {
      const base = g || {};
      const current = g === null ? true : !!g[heading];
      return { ...base, [heading]: !current };
    });

  const roleBadge = user?.role
    ? { area: "Area Access", manager: "Manager", teacher: "Teacher", commissioner: "Area Access", admin: "Admin" }[user.role]
    : "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-[${NAVY}] border-r border-white/10 flex flex-col sticky top-0 h-screen transition-all duration-300`} style={{ backgroundColor: NAVY }}>
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
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
          {collapsed ? (
            navGroups.flatMap((group) =>
              group.items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  title={n.label}
                  className={({ isActive }) =>
                    `relative flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full" style={{ backgroundColor: CRIMSON }} />}
                      <n.icon className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </NavLink>
              ))
            )
          ) : (
            navGroups.map((group) => {
              const open = isGroupOpen(group.heading);
              return (
                <div key={group.heading}>
                  <button
                    onClick={() => toggleGroup(group.heading)}
                    className="w-full flex items-center gap-2 px-3 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/45 hover:text-white/70 transition-colors"
                  >
                    <span className="inline-block w-3 h-px" style={{ backgroundColor: CRIMSON }} />
                    <span className="flex-1 text-left">{group.heading}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`} />
                  </button>
                  {open && (
                    <div className="space-y-0.5">
                      {group.items.map((n) => (
                        <NavLink
                          key={n.to}
                          to={n.to}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full" style={{ backgroundColor: CRIMSON }} />}
                              <n.icon className="w-4 h-4 shrink-0" /> {n.label}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

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
          <LandmarkPreview />
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