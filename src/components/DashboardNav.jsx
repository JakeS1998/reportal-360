import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles,
  ClipboardList, BookOpen, Award, ChevronDown, FileText,
  UserCog, BarChart3, Calendar, UserCheck, UserPlus, CalendarDays, Library, Home, Repeat, MessageSquare, ShieldCheck, Settings, KeyRound, Plus, X, Trophy,
} from "lucide-react";

const CRIMSON = "#9E1B32";

export default function DashboardNav({ collapsed, canManageStaff, canAccessAthletics, isManager, isArea, menuTextColor = "#FFFFFF", onNavigate, userKey }) {
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-groups");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return null;
    }
  });
  const quickLinksStorageKey = `my-reportal-links-${userKey || "default"}`;
  const [quickLinks, setQuickLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(quickLinksStorageKey) || localStorage.getItem("my-reportal-links")) || []; } catch { return []; }
  });
  const [quickLinkToAdd, setQuickLinkToAdd] = useState("");

  useEffect(() => { localStorage.setItem(quickLinksStorageKey, JSON.stringify(quickLinks)); }, [quickLinks, quickLinksStorageKey]);

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
        { to: "/reports", label: "Report Builder", icon: FileText },
        { to: "/parent-conversations", label: "Parent Conversations", icon: MessageSquare },
      ],
    },
    ...(!isArea ? [{
      heading: "Classroom",
      items: [
        { to: "/my-classes", label: "My Classes", icon: BookOpen },
        { to: "/assignment-submissions", label: "My Assignments", icon: ClipboardList },
        { to: "/class-cover", label: "Class Cover", icon: Repeat },
        { to: "/lesson-plans", label: "Lesson Plans", icon: ClipboardList },
        { to: "/syllabuses", label: "Syllabuses", icon: FileText },
      ],
    }] : []),
    ...(canAccessAthletics ? [{
      heading: "Athletics",
      items: [
        { to: "/athletics", label: "Teams & Schedule", icon: Trophy },
        { to: "/athletics/monitoring", label: "Athlete Monitoring", icon: ClipboardList },
      ],
    }] : []),
    {
      heading: "Account",
      items: [
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/training", label: "Training", icon: Award },
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  if (canManageStaff) {
    navGroups.push({
      heading: "Administration",
      sections: [
        { label: "People & Access", items: [
          { to: "/staff", label: "Admin Panel", icon: UserCog },
          { to: "/teacher-assignments", label: "Teacher Assignments", icon: UserCheck },
          { to: "/student-assignments", label: "Student Assignments", icon: UserPlus },
          { to: "/student-logins", label: "Student Login Management", icon: KeyRound },
          { to: "/student-access-audit", label: "Student Access Audit", icon: ShieldCheck },
        ] },
        ...(!isArea ? [{ label: "Academic Setup", items: [
          { to: "/subjects", label: "Subjects & Rooms", icon: Library },
          { to: "/classes", label: "Classes", icon: BookOpen },
          { to: "/homerooms", label: "Homerooms", icon: Home },
          { to: "/academic-years", label: "Academic Years", icon: Calendar },
          { to: "/assessment-weights", label: "Assessment Weights", icon: GraduationCap },
        ] }] : []),
        { label: "Scheduling & Attendance", items: [
          ...(!isArea ? [{ to: "/schedule", label: "Weekly Schedule", icon: CalendarDays }] : []),
          { to: "/attendance-review", label: "Attendance Review", icon: CalendarCheck },
        ] },
        { label: "Quality & Training", items: [
          { to: "/lesson-plan-reviews", label: "Lesson Plan Reviews", icon: ClipboardList },
          { to: "/training-dashboard", label: "Training Dashboard", icon: BarChart3 },
        ] },
        ...(isManager ? [{ label: "School Setup", items: [{ to: "/school-branding", label: "School Branding", icon: Settings }] }] : []),
      ],
    });
  }

  const groupItems = (group) => group.sections ? group.sections.flatMap((section) => section.items) : group.items;
  const availablePages = navGroups.flatMap(groupItems);
  const quickLinkPages = quickLinks.map((to) => availablePages.find((page) => page.to === to)).filter(Boolean);

  const isGroupOpen = (heading) =>
    openGroups === null ? true : !!openGroups[heading];

  const toggleGroup = (heading) =>
    setOpenGroups((g) => {
      const base = g || {};
      const current = g === null ? true : !!g[heading];
      return { ...base, [heading]: !current };
    });

  const isSectionOpen = (groupHeading, sectionLabel) =>
    openGroups === null ? true : !!openGroups[`${groupHeading}:${sectionLabel}`];

  const toggleSection = (groupHeading, sectionLabel) =>
    setOpenGroups((g) => {
      const base = g || {};
      const key = `${groupHeading}:${sectionLabel}`;
      const current = g === null ? true : !!g[key];
      return { ...base, [key]: !current };
    });

  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  if (collapsed) {
    return (
      <nav className="dashboard-nav-scrollbar flex-1 px-3 space-y-1 mt-2 overflow-y-auto" style={{ "--menu-text-color": menuTextColor }}>
        {navGroups.flatMap((group, gi) => [
          ...groupItems(group).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              title={`${group.heading} · ${n.label}`}
              onClick={handleNavigate}
              className={({ isActive }) =>
                `relative flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-[color:var(--menu-text-color)] opacity-65 hover:bg-white/10 hover:text-white"
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
          )),
          ...(gi < navGroups.length - 1
            ? [<div key={`sep-${group.heading}`} className="my-2 mx-3 h-px bg-white/10" title={group.heading} />]
            : []),
        ])}
      </nav>
    );
  }

  return (
    <nav className="dashboard-nav-scrollbar flex-1 px-3 space-y-1 mt-2 overflow-y-auto" style={{ "--menu-text-color": menuTextColor }}>
      <div>
        <button
          onClick={() => toggleGroup("My ReportAL")}
          className="w-full flex items-center gap-2 px-3 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--menu-text-color)] opacity-45 hover:text-white/70 transition-colors"
        >
          <span className="inline-block w-3 h-px" style={{ backgroundColor: CRIMSON }} />
          <span className="flex-1 text-left">My ReportAL</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isGroupOpen("My ReportAL") ? "" : "-rotate-90"}`} />
        </button>
        {isGroupOpen("My ReportAL") && (
          <div className="space-y-1">
            {quickLinkPages.map((page) => (
              <div key={page.to} className="flex items-center gap-1">
                <NavLink
                  to={page.to}
                  onClick={handleNavigate}
                  className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pl-6 text-sm font-medium transition-colors ${isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-[color:var(--menu-text-color)] opacity-65 hover:bg-white/10 hover:text-white"}`}
                >
                  <page.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{page.label}</span>
                </NavLink>
                <button onClick={() => setQuickLinks((links) => links.filter((to) => to !== page.to))} className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" title={`Remove ${page.label}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {quickLinks.length < 5 && (
              <div className="flex gap-1 px-3 pt-1">
                <select value={quickLinkToAdd} onChange={(event) => setQuickLinkToAdd(event.target.value)} className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1.5 text-xs text-white outline-none">
                  <option value="" className="text-slate-900">Add a page…</option>
                  {availablePages.filter((page) => !quickLinks.includes(page.to)).map((page) => <option key={page.to} value={page.to} className="text-slate-900">{page.label}</option>)}
                </select>
                <button
                  disabled={!quickLinkToAdd}
                  onClick={() => { setQuickLinks((links) => [...links, quickLinkToAdd]); setQuickLinkToAdd(""); }}
                  className="rounded bg-white/10 p-1.5 text-white hover:bg-white/20 disabled:opacity-40"
                  title="Add quick link"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {quickLinkPages.length === 0 && <p className="px-6 py-1 text-xs text-[color:var(--menu-text-color)] opacity-35">Add up to five pages for quick access.</p>}
          </div>
        )}
      </div>
      {navGroups.map((group) => {
        const open = isGroupOpen(group.heading);
        return (
          <div key={group.heading}>
            <button
              onClick={() => toggleGroup(group.heading)}
              className="w-full flex items-center gap-2 px-3 mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--menu-text-color)] opacity-45 hover:text-white/70 transition-colors"
            >
              <span className="inline-block w-3 h-px" style={{ backgroundColor: CRIMSON }} />
              <span className="flex-1 text-left">{group.heading}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && (
              <div className="space-y-0.5">
                {(group.sections || [{ items: group.items }]).map((section, sectionIndex) => {
                  const sectionOpen = !section.label || isSectionOpen(group.heading, section.label);
                  return (
                    <div key={section.label || sectionIndex} className={section.label ? "pt-2 first:pt-0" : ""}>
                      {section.label && (
                        <button
                          onClick={() => toggleSection(group.heading, section.label)}
                          className="flex w-full items-center gap-2 px-6 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--menu-text-color)] opacity-35 hover:text-[color:var(--menu-text-color)] opacity-65"
                        >
                          <span className="flex-1 text-left">{section.label}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${sectionOpen ? "" : "-rotate-90"}`} />
                        </button>
                      )}
                      {sectionOpen && section.items.map((n) => (
                        <NavLink
                          key={n.to}
                          to={n.to}
                          onClick={handleNavigate}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive ? "bg-[#1D4ED8] text-white shadow-sm" : "text-[color:var(--menu-text-color)] opacity-65 hover:bg-white/10 hover:text-white"
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
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}