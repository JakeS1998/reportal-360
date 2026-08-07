import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import Skeleton from "@/components/Skeleton";
import KpiCard from "@/components/KpiCard";
import { Users, Search } from "lucide-react";

export default function TeacherStudents() {
  const { user, school } = useSchool();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user?.username) { setLoading(false); return; }
      try {
        const res = await base44.functions.invoke("manageStudents", {
          action: "list",
          caller_username: user.username,
          caller_password: user.password || localStorage.getItem("userPassword") || "",
          school_code: user.school_code,
        });
        if (res.data?.success) setStudents(res.data.students || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.username]);

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.student_name || "").toLowerCase().includes(q) || (s.student_number || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="My Students" value={filtered.length} accent="#1D4ED8" tooltip="Students assigned to you via your classes or homeroom." />
        </div>
      </FadeIn>
      <FadeIn delay={60}>
        <SectionCard title="My Students" subtitle={`${filtered.length} student${filtered.length === 1 ? "" : "s"} · ${school?.school_name || ""}`} icon={Users}>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No students are assigned to your classes or homeroom yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <button key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 px-2 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{(s.student_name || "?").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.student_name}</p>
                    <p className="text-[11px] text-slate-400">Grade {s.grade_level || "—"}{s.homeroom ? ` · ${s.homeroom}` : ""}{s.student_number ? ` · #${s.student_number}` : ""}</p>
                  </div>
                  <span className="text-xs text-slate-400">{s.status === "active" ? "" : s.status}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}