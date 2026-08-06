import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SchoolProvider, useSchool } from "@/lib/SchoolContext";
import { LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles, LogOut, Building2, ClipboardList, PanelLeftClose, PanelLeftOpen, UserCog, BookOpen, Calendar, UserCheck, UserPlus, Award, BarChart3 } from "lucide-react";
import AlabamaOutline from "./AlabamaOutline";
import Logo from "./Logo";
import FilterBar from "./FilterBar";

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen transition-all duration-300`}>
        <div className={`${collapsed ? "px-2 justify-center" : "px-5"} py-6 flex items-center gap-3`}>
          {collapsed ? (
            <Logo variant="icon" className="h-10 w-auto shrink-0 rounded-lg" />
          ) : (
            <Logo className="shrink-0" iconClass="h-10 w-auto shrink-0" textClass="h-5 w-auto shrink-0" />
          )}
        </div>
        {!collapsed && user && (
          <div className="px-5 pb-2">
            <p className="text-xs font-medium text-slate-700 truncate">{user.full_name || user.username}</p>
            {roleBadge && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{roleBadge}</span>}
          </div>
        )}
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {nav.map((n, i) => {
            if (n.section) {
              if (collapsed) return null;
              return <p key={i} className="px-3 mt-4 mb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{n.section}</p>;
            }
            return (
              <NavLink
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                <n.icon className="w-4 h-4 shrink-0" /> {!collapsed && n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-1">
          <button
            onClick={switchSchool}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4 shrink-0" /> {!collapsed && "Sign Out"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#091B3D" }}>{school?.school_name || (isArea ? "All Schools" : "—")}</h1>
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
          <FilterBar school={school} contentRef={contentRef} />
          <div ref={contentRef}>
            <Outlet />
          </div>
          <footer className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <AlabamaOutline className="w-4 h-4 text-[#1D4ED8]" />
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