import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";

export default function DataAudit() {
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session || session.user?.role !== "admin") navigate("/admin-login");
  }, [navigate]);

  const runAudit = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await base44.functions.invoke("runSecurityScan", {
        caller_username: "BRGAdmin",
        caller_password: "BRGAdmin",
        audit_type: "data_quality",
      });
      if (res.data?.success) setAudit(res.data);
      else setError(res.data?.error || "The audit could not be completed.");
    } catch {
      setError("The audit could not be completed.");
    } finally {
      setRunning(false);
    }
  };

  const findings = audit?.findings || [];
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5">
      <div><h1 className="text-xl font-bold text-slate-900">School Data Audit</h1><p className="mt-0.5 text-xs text-slate-500">Review records for privacy and data-quality gaps without exposing student details.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => navigate("/admin")}>Back to Administration</Button><Button onClick={runAudit} disabled={running}><RefreshCw className={`mr-1 h-4 w-4 ${running ? "animate-spin" : ""}`} />{running ? "Running audit..." : "Run data audit"}</Button></div>
    </header>
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <SectionCard title="What this audit checks" subtitle="Privacy-related data completeness checks" icon={ClipboardCheck}>
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3"><p>Student records missing emergency contacts</p><p>Support-plan indicators missing supporting details</p><p>Accounts with MFA disabled or access issues</p></div>
      </SectionCard>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!audit && !running && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">Run an audit to review your school data controls.</div>}
      {audit && <><div className="grid grid-cols-3 gap-4"><Summary label="Checks" value={audit.summary.total} /><Summary label="Passed" value={audit.summary.passed} color="text-emerald-600" /><Summary label="Needs review" value={audit.summary.failed} color="text-rose-600" /></div><div className="space-y-3">{findings.map((finding) => <Finding key={finding.id} finding={finding} />)}</div><p className="text-right text-xs text-slate-400">Last audited {new Date(audit.scanned_at).toLocaleString()}</p></>}
    </main>
  </div>;
}

function Summary({ label, value, color = "text-slate-900" }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>; }
function Finding({ finding }) { const passed = finding.status === "pass"; const Icon = passed ? CheckCircle2 : AlertTriangle; return <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${passed ? "text-emerald-500" : "text-amber-500"}`} /><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{finding.title}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{passed ? "Pass" : "Review"}</span></div><p className="mt-1 text-sm text-slate-600">{finding.description}</p>{finding.recommendation && <p className="mt-2 text-sm text-slate-500">Recommended action: {finding.recommendation}</p>}</div></div>; }