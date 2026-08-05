import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import ProficiencyChart from "@/components/ProficiencyChart";
import MetricDelta from "@/components/MetricDelta";
import DemographicsSection from "@/components/DemographicsSection";

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
    setUser(session.user);
    const initialSchool = session.school;
    setSchool(initialSchool);
    if (initialSchool && initialSchool.system_code && initialSchool.school_code && (initialSchool.math_proficiency == null || !initialSchool.previous)) {
      base44.functions.invoke("fetchSchoolData", {
        system_code: initialSchool.system_code,
        school_code: initialSchool.school_code,
      }).then((res) => {
        const data = res.data;
        if (data && !data.error) {
          setSchool(data);
          localStorage.setItem("userSession", JSON.stringify({ ...session, school: data }));
        }
      }).catch(() => {});
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  if (!school) return null;

  const prev = school.previous || {};

  const metrics = [
    {
      label: "Academic Achievement",
      value: school.academic_achievement,
      previous: prev.academic_achievement,
      lowerIsBetter: false,
    },
    {
      label: "Academic Growth",
      value: school.academic_growth,
      previous: prev.academic_growth,
      lowerIsBetter: false,
    },
    {
      label: "Chronic Absenteeism",
      value: school.chronic_absenteeism,
      displayValue: school.chronic_absenteeism != null ? school.chronic_absenteeism + "%" : null,
      previous: prev.chronic_absenteeism,
      lowerIsBetter: true,
      suffix: "%",
    },
    {
      label: "Enrollment",
      value: school.enrollment,
      previous: prev.enrollment,
      lowerIsBetter: false,
    },
    {
      label: "Graduation Rate",
      value: school.graduation_rate,
      displayValue: school.graduation_rate != null ? school.graduation_rate + "%" : null,
      previous: prev.graduation_rate,
      lowerIsBetter: false,
      suffix: "%",
    },
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
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {m.displayValue != null ? m.displayValue : m.value != null ? m.value : "—"}
              </p>
              <MetricDelta
                current={m.value}
                previous={m.previous}
                lowerIsBetter={m.lowerIsBetter}
                suffix={m.suffix}
              />
            </Card>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mt-8 mb-4">Proficiency Rates</h2>
        <Card className="p-6 border-slate-200">
          <ProficiencyChart data={school} />
        </Card>

        <h2 className="text-lg font-semibold text-slate-900 mt-8 mb-4">Demographics</h2>
        <DemographicsSection data={school} />
      </main>
    </div>
  );
}