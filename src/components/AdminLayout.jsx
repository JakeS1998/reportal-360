import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Building2, Headphones, Users, BriefcaseBusiness, ShieldCheck, Search, LogOut } from "lucide-react";

const links = [
  ["/admin", "Overview", Building2], ["/admin/support", "Support desk", Headphones], ["/admin/access", "School access", ShieldCheck], ["/admin/clients", "Clients", BriefcaseBusiness], ["/admin/users", "Administrators & users", Users], ["/admin/discovery", "School discovery", Search],
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const session = JSON.parse(localStorage.getItem("userSession") || "null");
  if (!session?.user || session.user.role !== "admin") { navigate("/login"); return null; }
  const creds = { caller_username: session.user.username, caller_password: session.user.password };
  return <div className="min-h-screen bg-slate-50 lg:flex"><aside className="border-b border-slate-800 bg-slate-950 px-4 py-5 text-slate-200 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r"><div className="mb-7 px-3"><p className="text-lg font-bold text-white">ReportAL 360</p><p className="text-xs text-slate-400">Administration</p></div><nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-800 font-semibold text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</NavLink>)}</nav><button onClick={() => { localStorage.removeItem("userSession"); navigate("/login"); }} className="mt-7 flex items-center gap-3 px-3 text-sm text-slate-400 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></aside><main className="min-w-0 flex-1"><Outlet context={{ session, creds }} /></main></div>;
}