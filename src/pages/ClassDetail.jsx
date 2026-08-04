import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StudentRoster from "@/components/management/StudentRoster";
import AttendanceTab from "@/components/management/AttendanceTab";
import AttainmentTab from "@/components/management/AttainmentTab";
import BehaviourTab from "@/components/management/BehaviourTab";
import { ArrowLeft, Users } from "lucide-react";

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("students");

  const loadStudents = async () => {
    const data = await base44.entities.Student.filter({ class_id: classId }, "student_name", 500);
    setStudents(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const classData = await base44.entities.Class.get(classId);
        setCls(classData);
        await loadStudents();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Class not found.</p>
      </div>
    );
  }

  const tabs = [
    { id: "students", label: "Students" },
    { id: "attendance", label: "Attendance" },
    { id: "attainment", label: "Attainment" },
    { id: "behaviour", label: "Behaviour" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate("/management")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> All Classes
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{cls.class_name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span>{cls.school_name}</span>
            {cls.grade_level && <span>· {cls.grade_level}</span>}
            {cls.teacher_name && <span>· {cls.teacher_name}</span>}
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {students.length}</span>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "students" && <StudentRoster classId={classId} students={students} onRefresh={loadStudents} />}
        {tab === "attendance" && <AttendanceTab classId={classId} students={students} />}
        {tab === "attainment" && <AttainmentTab classId={classId} students={students} />}
        {tab === "behaviour" && <BehaviourTab classId={classId} students={students} />}
      </main>
    </div>
  );
}