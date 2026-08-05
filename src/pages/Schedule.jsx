import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, LogOut, Clock, MapPin, Zap, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import ClassForm from "@/components/management/ClassForm";
import SchoolAdminPanel from "@/components/management/SchoolAdminPanel";

export default function Schedule() {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session || (session.user.role !== "teacher" && session.user.role !== "school_admin")) {
      navigate("/");
      return;
    }
    setSchool(session.school);
    setUser(session.user);
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!school) return;
    try {
      const [cls, studs] = await Promise.all([
        base44.entities.Class.filter({ school_code: school.school_code }, "period", 500),
        base44.entities.Student.list("-created_date", 500),
      ]);
      setClasses(cls);
      setStudents(studs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  const studentCount = (classId) => students.filter((s) => s.class_id === classId).length;

  if (!school) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{school.school_name}</h1>
            <p className="text-sm text-slate-500">{school.system_name} · Code {school.school_code}</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Button onClick={() => navigate("/admin")} variant="outline" className="border-slate-300">
                <Shield className="w-4 h-4 mr-1" /> Admin
              </Button>
            )}
            {user?.role === 'school_admin' && (
              <Button onClick={() => navigate("/school-admin")} variant="outline" className="border-slate-300">
                <Shield className="w-4 h-4 mr-1" /> School Admin
              </Button>
            )}
            <Button onClick={() => navigate("/quick-attendance")} className="bg-slate-900 hover:bg-slate-800">
              <Zap className="w-4 h-4 mr-1" /> Quick Attendance
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-slate-300">
              <LogOut className="w-4 h-4 mr-1" /> Switch School
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-slate-200">
            <p className="text-xs text-slate-500">Academic Achievement</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{school.academic_achievement ?? "—"}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-xs text-slate-500">Academic Growth</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{school.academic_growth ?? "—"}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-xs text-slate-500">Chronic Absenteeism</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{school.chronic_absenteeism != null ? school.chronic_absenteeism + "%" : "—"}</p>
          </Card>
          <Card className="p-4 border-slate-200">
            <p className="text-xs text-slate-500">Enrollment</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{school.enrollment ?? "—"}</p>
          </Card>
        </div>

        {user?.role === "school_admin" && (
          <div className="mb-8">
            <SchoolAdminPanel school={school} user={user} />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Teaching Schedule</h2>
          <ClassForm school={school} onCreated={loadData} />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No classes yet. Create your first class to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="p-5 cursor-pointer hover:shadow-md transition-all border-slate-200 bg-white rounded-2xl"
                onClick={() => navigate(`/class/${cls.id}`)}
              >
                <h3 className="font-semibold text-slate-900 text-lg">{cls.class_name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  {cls.period && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {cls.period}</span>}
                  {cls.room && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cls.room}</span>}
                </div>
                {cls.subject && <p className="text-sm text-slate-500 mt-1">{cls.subject}</p>}
                <div className="flex items-center gap-1.5 mt-4 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  {studentCount(cls.id)} students
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}