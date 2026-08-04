import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/MetricCard";
import ProficiencyChart from "@/components/ProficiencyChart";
import RevenueBreakdown from "@/components/RevenueBreakdown";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  MapPin,
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  UserCog,
  Calendar,
} from "lucide-react";

export default function SchoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchool = async () => {
      try {
        const data = await base44.entities.School.get(id);
        setSchool(data);
      } catch (err) {
        console.error("Failed to load school", err);
      } finally {
        setLoading(false);
      }
    };
    loadSchool();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">School not found.</p>
          <button onClick={() => navigate("/")} className="text-slate-900 underline">
            Back to search
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (v) =>
    v ? `$${v.toLocaleString()}` : "—";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </button>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {school.school_name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {school.district}
                </span>
                {school.city && <span>· {school.city}, AL</span>}
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {school.grade_span || school.school_type}
                </span>
                {school.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {school.year}
                  </span>
                )}
              </div>
            </div>
            {school.academic_grade && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-bold bg-slate-900 text-white">
                  {school.academic_grade}
                </div>
                <span className="text-sm text-slate-400 mt-2">
                  {school.academic_score}/100
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Overview metrics */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Enrollment"
              value={school.enrollment ? school.enrollment.toLocaleString() : "—"}
              icon={Users}
              accent="blue"
            />
            <MetricCard
              label="Student-Teacher Ratio"
              value={school.student_teacher_ratio ? `${school.student_teacher_ratio}:1` : "—"}
              icon={UserCog}
              accent="purple"
            />
            <MetricCard
              label="Teachers"
              value={school.teacher_count?.toLocaleString() || "—"}
              icon={Users}
              accent="green"
            />
            <MetricCard
              label="Avg. Teacher Salary"
              value={formatCurrency(school.avg_teacher_salary)}
              icon={DollarSign}
              accent="amber"
            />
          </div>
        </section>

        {/* Academic Performance */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Academic Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <MetricCard
              label="Graduation Rate"
              value={school.graduation_rate ? `${school.graduation_rate}%` : "—"}
              icon={TrendingUp}
              accent="green"
            />
            <MetricCard
              label="Chronic Absenteeism"
              value={school.chronic_absenteeism ? `${school.chronic_absenteeism}%` : "—"}
              icon={TrendingDown}
              accent="rose"
            />
            <MetricCard
              label="Math Proficiency"
              value={school.math_proficiency ? `${school.math_proficiency}%` : "—"}
              accent="blue"
            />
            <MetricCard
              label="Reading Proficiency"
              value={school.reading_proficiency ? `${school.reading_proficiency}%` : "—"}
              accent="purple"
            />
          </div>
          <Card className="p-6 border-slate-200 bg-white rounded-2xl">
            <h3 className="text-sm font-medium text-slate-500 mb-4">
              Subject Proficiency Breakdown
            </h3>
            <ProficiencyChart data={school} />
          </Card>
        </section>

        {/* Financial / Resource Data */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Financial & Resource Data
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <MetricCard
              label="Per Pupil Expenditure"
              value={formatCurrency(school.per_pupil_expenditure)}
              icon={DollarSign}
              accent="amber"
            />
            <MetricCard
              label="Total Expenditure"
              value={school.total_expenditure ? `$${(school.total_expenditure / 1000000).toFixed(1)}M` : "—"}
              icon={Building2}
              accent="slate"
            />
            <MetricCard
              label="Federal Revenue"
              value={school.federal_revenue ? `$${(school.federal_revenue / 1000000).toFixed(1)}M` : "—"}
              accent="blue"
            />
            <MetricCard
              label="State Revenue"
              value={school.state_revenue ? `$${(school.state_revenue / 1000000).toFixed(1)}M` : "—"}
              accent="purple"
            />
          </div>
          <Card className="p-6 border-slate-200 bg-white rounded-2xl">
            <h3 className="text-sm font-medium text-slate-500 mb-4">
              Revenue Sources
            </h3>
            <RevenueBreakdown data={school} />
          </Card>
        </section>
      </main>
    </div>
  );
}