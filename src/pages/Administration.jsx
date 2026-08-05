import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import FadeIn from "@/components/FadeIn";
import SectionCard from "@/components/SectionCard";
import {
  Building2, School, RefreshCw, Search, Download, AlertTriangle,
  CheckCircle2, Clock, Activity, FileJson, FileSpreadsheet, Calendar,
} from "lucide-react";

export default function Administration() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [summary, setSummary] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!s || s.user?.role !== "admin") {
      navigate("/");
      return;
    }
    setSession(s);
    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    try {
      const res = await base44.functions.invoke("masterListApi", { resource: "stats", username: "BRGAdmin", password: "BRGAdmin" });
      if (res.data && !res.data.error) setStats(res.data);
    } catch {}
  };

  const creds = { username: "BRGAdmin", password: "BRGAdmin" };

  const runDiscovery = async (runType, trigger) => {
    if (running) return;
    setRunning(true);
    setProgress([]);
    setErrors([]);
    setSummary(null);
    const addLog = (msg) => setProgress((p) => [...p, msg]);
    try {
      addLog("Discovering Systems...");
      const sysRes = await base44.functions.invoke("discoverSchools", { phase: "systems", runType, trigger, ...creds });
      if (sysRes.data?.error) { addLog("Error: " + sysRes.data.error); setErrors([{ message: sysRes.data.error }]); }
      const systemsTotal = sysRes.data?.systemsTotal || 0;
      addLog(`Found ${systemsTotal} systems.`);
      if (sysRes.data?.errors) setErrors((e) => [...e, ...sysRes.data.errors]);

      if (systemsTotal > 0) {
        addLog("Processing Schools...");
        let batchStart = 0;
        let runId = sysRes.data?.runId;
        let done = false;
        while (!done) {
          const batchRes = await base44.functions.invoke("discoverSchools", {
            phase: "schools", batchStart, batchSize: 8, runType, trigger, runId, ...creds,
          });
          if (batchRes.data?.error) { addLog("Error: " + batchRes.data.error); break; }
          (batchRes.data?.log || []).forEach((l) => {
            if (!progress.includes(l)) addLog(l);
          });
          if (batchRes.data?.errors) setErrors((e) => [...e, ...batchRes.data.errors]);
          done = batchRes.data?.done;
          batchStart = batchRes.data?.batchStart || batchStart + 8;
          setSummary({
            systemsTotal: batchRes.data?.systemsTotal || systemsTotal,
            totalSchools: batchRes.data?.totalSchools || 0,
            newSchools: batchRes.data?.newSchools || 0,
            updatedSchools: batchRes.data?.updatedSchools || 0,
          });
        }
      }
      addLog("Finished.");
      loadStats();
    } catch (e) {
      addLog("Fatal error: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  const exportData = async (format) => {
    try {
      const res = await base44.functions.invoke("masterListApi", { resource: "schools", ...creds });
      const schools = res.data?.schools || [];
      if (format === "json") {
        const blob = new Blob([JSON.stringify(schools, null, 2)], { type: "application/json" });
        download(blob, "schools.json");
      } else {
        const headers = ["school_key", "system_code", "school_code", "school_name", "school_type", "status", "active"];
        const rows = schools.map((s) => headers.map((h) => `"${(s[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        download(new Blob([csv], { type: "text/csv" }), "schools.csv");
      }
    } catch {}
  };
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!session) return null;
  const lastRun = stats?.lastRun;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Administration · School Discovery</h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated master list from ALSDE Report Card</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/overview")}>Back to Dashboard</Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Total Systems" value={stats?.totalSystems ?? 0} color="#1D4ED8" />
            <StatCard icon={School} label="Total Schools" value={stats?.totalSchools ?? 0} color="#7C3AED" />
            <StatCard icon={Clock} label="Last Refresh" value={lastRun ? new Date(lastRun.start_time).toLocaleString() : "Never"} color="#0EA5E9" small />
            <StatCard icon={Calendar} label="Discovery Status" value={lastRun?.status || "—"} color={lastRun?.status === "completed" ? "#10B981" : lastRun?.status === "failed" ? "#EF4444" : "#F59E0B"} />
          </div>
        </FadeIn>

        <FadeIn delay={60}>
          <SectionCard title="Discovery Controls" subtitle="Retrieve and maintain the master school list" icon={Search}>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => runDiscovery("full", "manual")} disabled={running} className="bg-[#1D4ED8] hover:bg-[#1e40af]">
                <Search className="w-4 h-4 mr-1" /> {running ? "Running..." : "Discover Schools"}
              </Button>
              <Button onClick={() => runDiscovery("refresh", "manual")} disabled={running} variant="outline">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh Master List
              </Button>
              <Button onClick={() => exportData("csv")} variant="outline" disabled={running}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Export CSV
              </Button>
              <Button onClick={() => exportData("json")} variant="outline" disabled={running}>
                <FileJson className="w-4 h-4 mr-1" /> Export JSON
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Discover Schools runs a full sync. Refresh updates changed records only. Both compare against the local database and flag removed schools as inactive.
            </p>
          </SectionCard>
        </FadeIn>

        {(progress.length > 0 || running) && (
          <FadeIn delay={90}>
            <SectionCard title="Progress" subtitle="Live discovery activity" icon={Activity}>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-72 overflow-auto">
                {progress.map((l, i) => (
                  <div key={i} className={l.includes("Error") || l.includes("✘") ? "text-rose-400" : l.includes("✔") || l.includes("Finished") ? "text-emerald-400" : ""}>
                    {l}
                  </div>
                ))}
                {running && <div className="text-slate-500 animate-pulse">▌ working...</div>}
              </div>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <MiniStat label="Systems" value={summary.systemsTotal} />
                  <MiniStat label="Schools" value={summary.totalSchools} />
                  <MiniStat label="New" value={summary.newSchools} color="#10B981" />
                  <MiniStat label="Updated" value={summary.updatedSchools} color="#F59E0B" />
                </div>
              )}
            </SectionCard>
          </FadeIn>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={120}>
            <SectionCard title="Discovery History" subtitle="Recent runs" icon={Clock}>
              {stats?.recentRuns?.length ? (
                <div className="space-y-2">
                  {stats.recentRuns.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-800 capitalize">{r.run_type} · {r.trigger}</p>
                        <p className="text-xs text-slate-400">{new Date(r.start_time).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{r.systems_count || 0} sys · {r.schools_count || 0} sch</span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No runs yet.</p>
              )}
            </SectionCard>
          </FadeIn>

          <FadeIn delay={180}>
            <SectionCard title="Error Log" subtitle="Issues from the latest run" icon={AlertTriangle}>
              {errors.length ? (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {errors.slice(-20).map((e, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-rose-700">{e.system ? `[${e.system}] ` : ""}{e.message}</p>
                      {e.time && <p className="text-[10px] text-rose-400 mt-0.5">{new Date(e.time).toLocaleTimeString()}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> No errors recorded.
                </div>
              )}
            </SectionCard>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, small }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`font-bold text-slate-900 mt-2 ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: color || "#1D4ED8" }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { completed: ["#10B981", "#DCFCE7"], failed: ["#EF4444", "#FEE2E2"], partial: ["#F59E0B", "#FEF3C7"], running: ["#0EA5E9", "#E0F2FE"] };
  const [c, bg] = map[status] || ["#64748b", "#F1F5F9"];
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: c, backgroundColor: bg }}>{status}</span>;
}