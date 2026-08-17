import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import StudentSummaryReport from "@/components/student/StudentSummaryReport";
import InterventionManager from "@/components/student/InterventionManager";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { exportDashboardPdf } from "@/lib/exportPdf";
export default function StudentSummary() {
  const { studentId } = useParams(); const navigate = useNavigate(); const reportRef = useRef(null); const { user } = useSchool();
  const [data, setData] = useState(null); const [downloading, setDownloading] = useState(false);
  useEffect(() => { base44.functions.invoke("manageStudents", { action: "get_profile", caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email), student_id: studentId }).then((res) => { if (res.data?.success) { const attendance = res.data.attendance || []; const attainment = res.data.attainment || []; setData({ ...res.data, attendanceRate: attendance.length ? Math.round((attendance.filter((item) => item.status === "present").length / attendance.length) * 100) : null, avgScore: attainment.length ? Math.round(attainment.reduce((total, item) => total + (item.score / (item.max_score || 100)) * 100, 0) / attainment.length) : null }); } }); }, [studentId, user]);
  const download = async () => { setDownloading(true); await exportDashboardPdf(reportRef.current, `${data.student.student_name}-progress-summary.pdf`); setDownloading(false); };
  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const saveIntervention = (item) => setData((current) => ({ ...current, interventions: current.interventions?.some((entry) => entry.id === item.id) ? current.interventions.map((entry) => entry.id === item.id ? item : entry) : [item, ...(current.interventions || [])] }));
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Button variant="ghost" onClick={() => navigate(`/students/${studentId}`)}><ArrowLeft className="mr-1 h-4 w-4" />Student profile</Button><div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print</Button><Button onClick={download} disabled={downloading}><Download className="mr-1 h-4 w-4" />{downloading ? "Preparing..." : "Download PDF"}</Button></div></div><StudentSummaryReport ref={reportRef} student={data.student} attainment={data.attainment || []} behaviour={data.behaviour || []} interventions={data.interventions || []} attendanceRate={data.attendanceRate} avgScore={data.avgScore} /><div className="print:hidden rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">Intervention management</h2><div className="mt-4"><InterventionManager student={data.student} interventions={data.interventions || []} user={user} onSaved={saveIntervention} /></div></div></div>;
}