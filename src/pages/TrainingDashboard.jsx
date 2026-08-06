import React, { useEffect, useState, useMemo } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Clock, Award } from "lucide-react";
import FadeIn from "@/components/FadeIn";

export default function TrainingDashboard() {
  const { user, school } = useSchool();
  const [data, setData] = useState({ staff: [], completions: [], modules: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageTraining", {
        action: "list_completions",
        caller_username: user.username,
      });
      if (res.data?.success) setData(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const { staff, completions, modules } = data;

  const moduleStats = useMemo(() => {
    return modules.map(m => {
      const passedCompletions = completions.filter(c => c.module_id === m.id && c.passed);
      const completedStaffIds = new Set(passedCompletions.map(c => c.user_id));
      return {
        ...m,
        completed: completedStaffIds.size,
        total: staff.length,
        rate: staff.length > 0 ? Math.round((completedStaffIds.size / staff.length) * 100) : 0,
      };
    });
  }, [modules, completions, staff]);

  const overallRate = useMemo(() => {
    const totalRequired = staff.length * modules.length;
    if (totalRequired === 0) return 0;
    const totalPassed = completions.filter(c => c.passed).length;
    return Math.round((totalPassed / totalRequired) * 100);
  }, [staff, modules, completions]);

  const staffProgress = useMemo(() => {
    const map = {};
    staff.forEach(s => { map[s.id] = {}; });
    completions.forEach(c => {
      if (!map[c.user_id]) map[c.user_id] = {};
      map[c.user_id][c.module_id] = c;
    });
    return map;
  }, [staff, completions]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-400">Loading training data...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5" /> Training Completion Dashboard
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                {school?.school_name || "Your School"} · {staff.length} staff members
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{overallRate}%</p>
                <p className="text-xs text-slate-400 mt-0.5">Overall Completion</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{modules.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Active Modules</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={50}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Module Completion Rates</h3>
          <div className="space-y-4">
            {moduleStats.map(m => (
              <div key={m.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{m.title}</span>
                    {m.is_annual_refresher && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Refresher</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{m.completed}/{m.total} ({m.rate}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.rate >= 80 ? "bg-emerald-500" : m.rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${m.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={100}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Staff Training Progress</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">Staff Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  {modules.map(m => (
                    <th key={m.id} className="px-3 py-3 font-medium text-center" title={m.title}>
                      {m.title.length > 20 ? m.title.substring(0, 18) + "…" : m.title}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-center">Overall</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const progress = staffProgress[s.id] || {};
                  const passedCount = modules.filter(m => progress[m.id]?.passed).length;
                  const overallPct = modules.length > 0 ? Math.round((passedCount / modules.length) * 100) : 0;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-700 whitespace-nowrap">{s.full_name || s.username}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 capitalize">{s.role}</td>
                      {modules.map(m => {
                        const comp = progress[m.id];
                        return (
                          <td key={m.id} className="px-3 py-3 text-center">
                            {comp?.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : comp ? (
                              <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          overallPct >= 80 ? "bg-emerald-50 text-emerald-700" :
                          overallPct >= 50 ? "bg-amber-50 text-amber-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {overallPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}