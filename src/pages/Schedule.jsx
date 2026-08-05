import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Schedule() {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session) {
      navigate("/");
      return;
    }
    setSchool(session.school);
    setUser(session.user);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  if (!school) return null;

  const metrics = [
    { label: "Academic Achievement", value: school.academic_achievement },
    { label: "Academic Growth", value: school.academic_growth },
    { label: "Chronic Absenteeism", value: school.chronic_absenteeism != null ? school.chronic_absenteeism + "%" : null },
    { label: "Enrollment", value: school.enrollment },
    { label: "Graduation Rate", value: school.graduation_rate != null ? school.graduation_rate + "%" : null },
    { label: "Math Proficiency", value: school.math_proficiency != null ? school.math_proficiency + "%" : null },
    { label: "Reading Proficiency", value: school.reading_proficiency != null ? school.reading_proficiency + "%" : null },
    { label: "Science Proficiency", value: school.science_proficiency != null ? school.science_proficiency + "%" : null },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{school.school_name}</h1>
            <p className="text-sm text-slate-500">
              {school.system_name} · Code {school.school_code}
              {school.school_type ? ` · ${school.school_type}` : ""}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-slate-300">
            <LogOut className="w-4 h-4 mr-1" /> Switch School
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          School Insights — {school.year || "2025"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label} className="p-4 border-slate-200">
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{m.value ?? "—"}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}