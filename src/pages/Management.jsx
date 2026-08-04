import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import ClassForm from "@/components/management/ClassForm";
import { Users, ArrowLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Management() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [cls, studs] = await Promise.all([
        base44.entities.Class.list("-created_date", 500),
        base44.entities.Student.list("-created_date", 500),
      ]);
      setClasses(cls);
      setStudents(studs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const studentCount = (classId) => students.filter(s => s.class_id === classId).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Class Management</h1>
              <p className="text-sm text-slate-500">Attendance, attainment & behaviour</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 shrink-0">
            <ArrowLeft className="w-4 h-4" /> School Insights
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ClassForm onCreated={loadData} />
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Classes</h2>
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No classes yet. Create your first class to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Card
                key={cls.id}
                className="p-5 cursor-pointer hover:shadow-md transition-all border-slate-200 bg-white rounded-2xl"
                onClick={() => navigate(`/management/class/${cls.id}`)}
              >
                <h3 className="font-semibold text-slate-900 text-lg">{cls.class_name}</h3>
                <p className="text-sm text-slate-500 mt-1">{cls.school_name}</p>
                <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                  {cls.grade_level && <span>{cls.grade_level}</span>}
                  {cls.teacher_name && <span>· {cls.teacher_name}</span>}
                </div>
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