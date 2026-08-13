import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, LayoutDashboard, LogOut } from "lucide-react";
import AlabamaOutline from "@/components/AlabamaOutline";
import LogoMono from "@/components/LogoMono";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

export default function StudentPortalLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!stored?.user || stored.user.role !== "student") {
      navigate("/login", { replace: true });
      return;
    }
    setSession(stored);
  }, [navigate]);

  if (!session) return null;
  const student = session.user;
  const school = session.school;
  const links = [
    { to: "/my-student", label: "My Dashboard", icon: LayoutDashboard },
    { to: "/my-assignments", label: "My Assignments", icon: BookOpen },
  ];
  const signOut = () => { localStorage.removeItem("userSession"); navigate("/login", { replace: true }); };

  return <div className="min-h-screen bg-[#F8FAFC] flex">
    <aside className="hidden md:flex w-60 shrink-0 flex-col sticky top-0 h-screen border-r border-white/10" style={{ backgroundColor: NAVY }}>
      <div className="px-5 py-5"><LogoMono className="w-full max-w-[180px] rounded-lg" /></div>
      <div className="px-5 pb-3"><p className="text-xs font-medium text-white/85 truncate">{student.full_name || student.username}</p><span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Student Portal</span></div>
      <nav className="flex-1 px-3 space-y-1">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-[#1D4ED8] text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon className="w-4 h-4" />{label}</NavLink>)}</nav>
      <button onClick={signOut} className="m-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/65 hover:bg-white/10 hover:text-white"><LogOut className="w-4 h-4" />Sign Out</button>
    </aside>
    <div className="flex-1 min-w-0">
      <header className="px-4 md:px-8 py-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-50" style={{ backgroundColor: NAVY }}>
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: CRIMSON }}><AlabamaOutline className="w-3.5 h-3.5" />ReportAL 360</p><h1 className="text-base md:text-xl font-bold text-white truncate">{school?.school_name || "Student Portal"}</h1><p className="text-xs text-white/60 truncate">{student.full_name || student.username}{student.grade_level ? ` · Grade ${student.grade_level}` : ""}</p></div>
        <button onClick={signOut} className="md:hidden text-sm text-white/75 hover:text-white"><LogOut className="w-4 h-4" /></button>
      </header>
      <main className="p-4 md:p-8"><Outlet /></main>
    </div>
  </div>;
}