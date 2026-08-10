import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, GraduationCap, CalendarCheck, Users, Sparkles,
  ClipboardList, BookOpen, Award, ChevronDown, FileText,
  UserCog, BarChart3, Calendar, UserCheck, UserPlus, CalendarDays, Library, Home, Repeat, MessageSquare, ShieldCheck,
} from "lucide-react";

const CRIMSON = "#9E1B32";

export default function DashboardNav({ collapsed, canManageStaff, onNavigate }) {
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-groups");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return null;
    }
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
        { to: "/reports", label: "Report Builder", icon: FileText },
      ],
    },
    {
      heading: "Classroom",
      items: [
        { to: "/my-classes", label: "My Classes", icon: BookOpen },
        { to: "/class-cover", label: "Class Cover", icon: Repeat },
        { to: "/lesson-plans", label: "Lesson Plans", icon: ClipboardList },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/training", label: "Training", icon: Award },
      ],
    },
  ];

  if (canManageStaff) {
    navGroups.push({
      heading: "Administration",
      items: [
        { to: "/staff", label: "Admin Panel", icon: UserCog },
        { to: "/lesson-plan-reviews", label: "Lesson Plan Reviews", icon: ClipboardList },
        { to: "/subjects", label: "Subjects & Rooms", icon: Library },
        { to: "/schedule", label: "Weekly Schedule", icon: CalendarDays },
        { to: "/homerooms", label: "Homerooms", icon: Home },
        { to: "/training-dashboard", label: "Training Dashboard", icon: BarChart3 },
        { to: "/classes", label: "Classes", icon: BookOpen },
        { to: "/academic-years", label: "Academic Years", icon: Calendar },
        { to: "/teacher-assignments", label: "Teacher Assignments", icon: UserCheck },
        { to: "/student-assignments", label: "Student Assignments", icon: UserPlus },
        { to: "/student-access-audit", label: "Student Access Audit", icon: ShieldCheck },
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

  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  if (collapsed) {
    return (
      <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
        {navGroups.flatMap((group, gi) => [
          ...group.items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              title={`${group.heading} · ${n.label}`}
              onClick={handleNavigate}
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
          )),
          ...(gi < navGroups.length - 1
            ? [<div key={`sep-${group.heading}`} className="my-2 mx-3 h-px bg-white/10" title={group.heading} />]
            : []),
        ])}
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
      {navGroups.map((group) => {
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
                    onClick={handleNavigate}
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
      })}
    </nav>
  );
}