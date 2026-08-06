import React, { useEffect, useState } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import FadeIn from "@/components/FadeIn";
import TrainingModuleDetail from "@/components/training/TrainingModuleDetail";

export default function TrainingPortal() {
  const { user } = useSchool();
  const [modules, setModules] = useState([]);
  const [completions, setCompletions] = useState({});
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadModules();
  }, [user]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageTraining", {
        action: "list_modules",
        caller_username: user.username,
      });
      if (res.data?.success) {
        setModules(res.data.modules || []);
        const compMap = {};
        (res.data.completions || []).forEach(c => { compMap[c.module_id] = c; });
        setCompletions(compMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (selectedModule) {
    return (
      <div className="max-w-4xl mx-auto">
        <TrainingModuleDetail
          module={selectedModule}
          completion={completions[selectedModule.id]}
          onBack={() => { setSelectedModule(null); loadModules(); }}
          onCompleted={loadModules}
          user={user}
        />
      </div>
    );
  }

  const completedCount = Object.values(completions).filter(c => c.passed).length;
  const totalCount = modules.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Training Portal
              </h2>
              <p className="text-sm text-slate-300 mt-1">Complete your assigned training modules and exams</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{progressPct}%</p>
                <p className="text-xs text-slate-400 mt-0.5">Complete</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{completedCount}/{totalCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Modules</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">Loading training modules...</div>
      ) : modules.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">No training modules assigned to your role.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m, i) => {
            const comp = completions[m.id];
            return (
              <FadeIn key={m.id} delay={i * 50}>
                <button
                  onClick={() => setSelectedModule(m)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{m.category}</span>
                      {m.is_annual_refresher && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Annual Refresher</span>
                      )}
                    </div>
                    {comp?.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : comp ? (
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{m.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{m.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" /> {m.duration_minutes || 15} min
                    </span>
                    {comp?.passed ? (
                      <span className="text-xs font-medium text-emerald-600">Passed ({comp.score}%)</span>
                    ) : comp ? (
                      <span className="text-xs font-medium text-amber-600">Retry needed ({comp.score}%)</span>
                    ) : (
                      <span className="text-xs font-medium text-[#1D4ED8]">Start →</span>
                    )}
                  </div>
                </button>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}