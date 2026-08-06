import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Link } from "react-router-dom";
import { BookOpen, Users } from "lucide-react";

export default function MyClasses() {
  const { user } = useSchool();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const assignments = await base44.entities.TeacherClass.filter({ teacher_id: user.id });
        if (assignments.length === 0) { setClasses([]); setLoading(false); return; }
        const classIds = assignments.map((a) => a.class_id);
        const allClasses = await base44.entities.Class.filter({ school_code: user.school_code }, "-created_date", 500);
        const myClasses = allClasses.filter((c) => classIds.includes(c.id));
        const studentAssignments = await base44.entities.StudentClass.filter({ school_code: user.school_code }, undefined, 500);
        const counts = {};
        studentAssignments.forEach((sa) => { if (sa.status === "active") counts[sa.class_id] = (counts[sa.class_id] || 0) + 1; });
        setClasses(myClasses.map((c) => ({ ...c, studentCount: counts[c.id] || 0, role: assignments.find((a) => a.class_id === c.id)?.role })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Classes</h2>
        <p className="text-sm text-slate-500">{classes.length} class{classes.length === 1 ? "" : "es"} assigned to you</p>
      </div>
      {classes.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No classes assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link key={c.id} to={`/classes/${c.id}`} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{c.class_name}</h3>
                  <p className="text-xs text-slate-500">{c.subject || "—"} · Grade {c.grade_level || "—"}</p>
                </div>
                {c.role && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">{c.role}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.studentCount} student{c.studentCount === 1 ? "" : "s"}</span>
                {c.room && <><span className="text-slate-300">·</span><span>Room {c.room}</span></>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}