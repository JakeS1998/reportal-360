import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, ClipboardCheck, LayoutDashboard } from "lucide-react";

const destinations = [
  { to: "/student-performance", title: "Performance", text: "Review class averages and assessment grades.", icon: BookOpen },
  { to: "/student-schedule", title: "Schedule", text: "See your weekly class timetable.", icon: Calendar },
  { to: "/student-attendance", title: "Attendance", text: "Review your recorded attendance.", icon: ClipboardCheck },
  { to: "/my-assignments", title: "Assignments", text: "Submit work and review released grades.", icon: LayoutDashboard },
];

export default function StudentDashboard() {
  return <div className="max-w-5xl mx-auto space-y-6"><div><h1 className="text-xl font-bold text-slate-900">My Dashboard</h1><p className="text-sm text-slate-500">Choose an area to view your school information.</p></div><div className="grid gap-4 sm:grid-cols-2">{destinations.map(({ to, title, text, icon: Icon }) => <Link key={to} to={to} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-200"><Icon className="mb-4 h-5 w-5 text-blue-600" /><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></Link>)}</div></div>;
}