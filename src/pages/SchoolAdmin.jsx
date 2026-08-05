import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, Users, BookOpen, CalendarClock } from "lucide-react";
import ClassesTab from "@/components/schooladmin/ClassesTab";
import StudentsTab from "@/components/schooladmin/StudentsTab";
import ScheduleTab from "@/components/schooladmin/ScheduleTab";

export default function SchoolAdmin() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("classes");

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!s || s.user.role !== "school_admin") {
      navigate("/");
      return;
    }
    setSession(s);
  }, [navigate]);

  if (!session) return null;
  const { school, user } = session;

  const tabs = [
    { id: "classes", label: "Classes", icon: BookOpen },
    { id: "students", label: "Students", icon: Users },
    { id: "schedule", label: "Schedule", icon: CalendarClock },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">School Admin · {school.school_name}</h1>
            <p className="text-sm text-slate-500">Code {school.school_code} · {user.full_name || user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/schedule")} variant="outline" className="border-slate-300">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Schedule
            </Button>
            <Button onClick={() => { localStorage.removeItem("userSession"); navigate("/"); }} variant="outline" className="border-slate-300">
              <LogOut className="w-4 h-4 mr-1" /> Switch School
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "classes" && <ClassesTab school={school} user={user} />}
        {tab === "students" && <StudentsTab school={school} user={user} />}
        {tab === "schedule" && <ScheduleTab school={school} user={user} />}
      </main>
    </div>
  );
}