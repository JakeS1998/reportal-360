import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import FadeIn from "@/components/FadeIn";
import SectionCard from "@/components/SectionCard";
import SecurityMetricCard from "@/components/SecurityMetricCard";
import {
  Shield, ShieldAlert, LogIn, Lock, Eye, Download, Activity,
  AlertTriangle, CheckCircle2, RefreshCw, Search, FileDown, LogOut, Users, Radar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const EVENT_BADGES = {
  login_success: { color: "#10B981", bg: "#ECFDF5", label: "Login" },
  login_failed: { color: "#F59E0B", bg: "#FFFBEB", label: "Failed Login" },
  login_locked: { color: "#EF4444", bg: "#FEF2F2", label: "Account Locked" },
  user_created: { color: "#3B82F6", bg: "#EFF6FF", label: "User Created" },
  user_deleted: { color: "#EF4444", bg: "#FEF2F2", label: "User Deleted" },
  user_updated: { color: "#3B82F6", bg: "#EFF6FF", label: "User Updated" },
  password_reset: { color: "#8B5CF6", bg: "#F5F3FF", label: "Password Reset" },
  password_reset_admin: { color: "#8B5CF6", bg: "#F5F3FF", label: "Admin Reset" },
  data_export: { color: "#6B7280", bg: "#F9FAFB", label: "Data Export" },
  admin_action: { color: "#6B7280", bg: "#F9FAFB", label: "Admin Action" },
  view_student: { color: "#0EA5E9", bg: "#E0F2FE", label: "View Student" },
  search_student: { color: "#0EA5E9", bg: "#E0F2FE", label: "Search Student" },
  edit_student: { color: "#F59E0B", bg: "#FFFBEB", label: "Edit Student" },
  view_assessment: { color: "#8B5CF6", bg: "#F5F3FF", label: "View Assessment" },
  view_attendance: { color: "#6B7280", bg: "#F9FAFB", label: "View Attendance" },
  view_discipline: { color: "#EF4444", bg: "#FEF2F2", label: "View Discipline" },
};

const CHART_COLORS = ["#1D4ED8", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9", "#64748B", "#EC4899"];
const STUDENT_ACTIONS = ["view_student", "search_student", "edit_student", "view_assessment", "view_attendance", "view_discipline"];

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ event_type: "", search: "" });
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!s || s.user?.role !== "admin") {
      navigate("/admin-login");
      return;
    }
    setSession(s);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "security_stats",
        caller_username: "BRGAdmin",
        caller_password: "BRGAdmin",
      });
      if (res.data?.success) {
        setStats(res.data.stats);
        setLogs(res.data.stats.recentLogs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("runSecurityScan", {
        caller_username: "BRGAdmin",
        caller_password: "BRGAdmin",
      });
      if (res.data?.success) {
        setScan({ findings: res.data.findings, summary: res.data.summary, scanned_at: res.data.scanned_at });
      }
    } catch {
      // ignore
    } finally {
      setScanning(false);
    }
  };

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filter.event_type) {
      result = result.filter((l) => l.event_type === filter.event_type);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.username?.toLowerCase().includes(q) ||
          l.details?.toLowerCase().includes(q) ||
          l.ip_address?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, filter]);

  // Chart data computations
  const loginActivityData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((d) => {
      const dayStr = d.toISOString().split("T")[0];
      const dayLogs = logs.filter((l) => l.created_date && l.created_date.startsWith(dayStr));
      return {
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        success: dayLogs.filter((l) => l.event_type === "login_success").length,
        failed: dayLogs.filter((l) => l.event_type === "login_failed" || l.event_type === "login_locked").length,
      };
    });
  }, [logs]);

  const eventTypeData = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      counts[l.event_type] = (counts[l.event_type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({
        name: EVENT_BADGES[name]?.label || name,
        value,
        key: name,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [logs]);

  const studentAccessData = useMemo(() => {
    return STUDENT_ACTIONS.map((action) => ({
      action: action.replace(/_/g, " "),
      count: logs.filter((l) => l.event_type === action).length,
    })).filter((d) => d.count > 0);
  }, [logs]);

  const suspiciousAlerts = useMemo(() => {
    if (!stats) return [];
    const alerts = [];
    if (stats.failedLogins > 10)
      alerts.push({ severity: "high", icon: ShieldAlert, message: `${stats.failedLogins} failed login attempts recorded`, color: "#EF4444" });
    if (stats.lockedAccounts > 0)
      alerts.push({ severity: "high", icon: Lock, message: `${stats.lockedAccounts} account(s) currently locked out`, color: "#EF4444" });
    if (stats.exportEvents > 20)
      alerts.push({ severity: "medium", icon: Download, message: `${stats.exportEvents} data exports — review for unusual volume`, color: "#F59E0B" });
    if (stats.mfaCoverage < 100 && stats.totalUsers > 0)
      alerts.push({ severity: "medium", icon: Shield, message: `MFA coverage at ${stats.mfaCoverage}% — target 100%`, color: "#F59E0B" });
    if (stats.failedAttemptAccounts > 0)
      alerts.push({ severity: "low", icon: AlertTriangle, message: `${stats.failedAttemptAccounts} account(s) with pending failed attempts`, color: "#64748B" });
    return alerts;
  }, [stats]);

  const healthScore = useMemo(() => {
    if (!stats) return 0;
    const mfaCoverage = stats.totalUsers > 0 ? stats.mfaCoverage : 100;
    const accountHealth = stats.totalUsers > 0
      ? Math.round(((stats.totalUsers - stats.lockedAccounts) / stats.totalUsers) * 100)
      : 100;
    const loginSuccessRate = (stats.totalLogins + stats.failedLogins) > 0
      ? Math.round((stats.totalLogins / (stats.totalLogins + stats.failedLogins)) * 100)
      : 100;
    return Math.round(mfaCoverage * 0.3 + accountHealth * 0.3 + loginSuccessRate * 0.4);
  }, [stats]);

  const healthColor = healthScore >= 80 ? "#10B981" : healthScore >= 60 ? "#F59E0B" : "#EF4444";
  const healthLabel = healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Needs Attention" : "Critical";

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">FERPA compliance monitoring and threat detection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/ferpa")}>FERPA Compliance</Button>
          <Button variant="outline" onClick={() => navigate("/admin")}>Admin Console</Button>
          <Button variant="ghost" onClick={() => { localStorage.removeItem("userSession"); navigate("/admin-login"); }}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Health Score + Metric Cards */}
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Security Health Score */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white lg:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" style={{ color: healthColor }} />
                    <h3 className="text-sm font-semibold">Security Health Score</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34" fill="none" stroke={healthColor} strokeWidth="6"
                          strokeDasharray={`${(healthScore / 100) * 214} 214`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{healthScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: healthColor }}>{healthLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">MFA · Account · Login</p>
                    </div>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <SecurityMetricCard icon={LogIn} label="Total Logins" value={stats?.totalLogins ?? 0} color="#10B981" />
                  <SecurityMetricCard icon={ShieldAlert} label="Failed Logins" value={stats?.failedLogins ?? 0} color="#F59E0B" />
                  <SecurityMetricCard icon={Lock} label="Locked Accounts" value={stats?.lockedAccounts ?? 0} color="#EF4444" />
                  <SecurityMetricCard icon={Eye} label="Student Access" value={stats?.studentAccessEvents ?? 0} color="#0EA5E9" />
                  <SecurityMetricCard icon={Download} label="Data Exports" value={stats?.exportEvents ?? 0} color="#6B7280" />
                  <SecurityMetricCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="#1D4ED8" subtitle={`${stats?.mfaEnabled ?? 0} with MFA`} />
                </div>
              </div>
            </FadeIn>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FadeIn delay={60}>
                <SectionCard title="Login Activity" subtitle="Last 7 days" icon={Activity}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={loginActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                        cursor={{ fill: "#F8FAFC" }}
                      />
                      <Bar dataKey="success" fill="#10B981" radius={[4, 4, 0, 0]} name="Successful" />
                      <Bar dataKey="failed" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
              </FadeIn>

              <FadeIn delay={120}>
                <SectionCard title="Event Distribution" subtitle="Audit events by type" icon={Eye}>
                  {eventTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={eventTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {eventTypeData.map((entry, i) => (
                            <Cell key={entry.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[240px] text-sm text-slate-400">No events recorded</div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {eventTypeData.slice(0, 6).map((e, i) => (
                      <div key={e.key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-slate-500">{e.name}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </FadeIn>
            </div>

            {/* Student Access Chart + Suspicious Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FadeIn delay={180}>
                <SectionCard title="Student Record Access" subtitle="FERPA-protected data views by action" icon={Eye}>
                  {studentAccessData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={studentAccessData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="action" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={100} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                          cursor={{ fill: "#F8FAFC" }}
                        />
                        <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm text-slate-400">No student record access logged yet</p>
                    </div>
                  )}
                </SectionCard>
              </FadeIn>

              <FadeIn delay={240}>
                <SectionCard title="Suspicious Activity Alerts" subtitle="Potential security concerns" icon={AlertTriangle}>
                  {suspiciousAlerts.length > 0 ? (
                    <div className="space-y-2.5">
                      {suspiciousAlerts.map((alert, i) => {
                        const Icon = alert.icon;
                        return (
                          <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alert.color + "20" }}>
                              <Icon className="w-4 h-4" style={{ color: alert.color }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-700">{alert.message}</p>
                              <span className="text-[10px] font-semibold uppercase mt-0.5 inline-block" style={{ color: alert.color }}>
                                {alert.severity} severity
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm text-slate-400">No suspicious activity detected</p>
                    </div>
                  )}
                </SectionCard>
              </FadeIn>
            </div>

            {/* Automated Security Scan (Penetration Testing) */}
            <FadeIn delay={270}>
              <SectionCard
                title="Automated Security Scan"
                subtitle="Pentest-style checks against live accounts & session controls"
                icon={Radar}
                action={
                  <Button onClick={runScan} disabled={scanning} size="sm">
                    <RefreshCw className={`w-4 h-4 mr-1 ${scanning ? "animate-spin" : ""}`} />
                    {scanning ? "Scanning..." : "Run Scan"}
                  </Button>
                }
              >
                {!scan ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <Radar className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-400">No scan run yet. Click "Run Scan" to check accounts and session controls.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{scan.summary.passed} passed</span>
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold">{scan.summary.failed} findings</span>
                      {scan.summary.high > 0 && <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold">{scan.summary.high} high</span>}
                      {scan.summary.medium > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">{scan.summary.medium} medium</span>}
                      {scan.summary.low > 0 && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{scan.summary.low} low</span>}
                    </div>
                    {scan.findings.map((f) => {
                      const sev = f.severity;
                      const color = sev === "high" ? "#EF4444" : sev === "medium" ? "#F59E0B" : sev === "low" ? "#64748B" : sev === "info" ? "#3B82F6" : "#10B981";
                      const Icon = f.status === "pass" ? CheckCircle2 : AlertTriangle;
                      return (
                        <div key={f.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">{f.title}</p>
                              <span className="text-[10px] font-semibold uppercase" style={{ color }}>{sev === "pass" ? "Pass" : sev}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>
                            {f.recommendation && <p className="text-xs text-slate-400 mt-1">→ {f.recommendation}</p>}
                          </div>
                        </div>
                      );
                    })}
                    {scan.scanned_at && (
                      <p className="text-[11px] text-slate-400 text-right">Last scanned {new Date(scan.scanned_at).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </SectionCard>
            </FadeIn>

            {/* Audit History */}
            <FadeIn delay={300}>
              <SectionCard
                title="Audit History"
                subtitle={`${filteredLogs.length} of ${logs.length} events`}
                icon={Eye}
                action={
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        value={filter.search}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        placeholder="Search..."
                        className="text-xs border border-slate-200 rounded-md pl-8 pr-3 py-1.5 bg-white text-slate-600 w-32 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <select
                      value={filter.event_type}
                      onChange={(e) => setFilter({ ...filter, event_type: e.target.value })}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-600"
                    >
                      <option value="">All Events</option>
                      {Object.entries(EVENT_BADGES).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        <th className="pb-2 pr-4 font-medium">Timestamp (UTC)</th>
                        <th className="pb-2 pr-4 font-medium">Event</th>
                        <th className="pb-2 pr-4 font-medium">User</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium">IP Address</th>
                        <th className="pb-2 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-slate-400">No audit entries found.</td>
                        </tr>
                      ) : (
                        filteredLogs.slice(0, 50).map((log) => {
                          const badge = EVENT_BADGES[log.event_type] || EVENT_BADGES.admin_action;
                          return (
                            <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 pr-4 text-xs text-slate-500 whitespace-nowrap">
                                {log.created_date ? new Date(log.created_date).toLocaleString() : "—"}
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: badge.color, backgroundColor: badge.bg }}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-slate-700 font-medium whitespace-nowrap">{log.username || "—"}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500 whitespace-nowrap">{log.user_role || "—"}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500 font-mono whitespace-nowrap">{log.ip_address || "—"}</td>
                              <td className="py-2.5 text-xs text-slate-600">{log.details || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </FadeIn>
          </>
        )}
      </main>
    </div>
  );
}