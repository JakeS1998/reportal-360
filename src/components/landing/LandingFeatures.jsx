import React from "react";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  Users,
  Sparkles,
  BookOpen,
  Award,
  ShieldCheck,
} from "lucide-react";

const CRIMSON = "#9E1B32";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Executive Overview",
    desc: "Accountability grades, graduation rates, and proficiency scores benchmarked against county and state averages.",
  },
  {
    icon: GraduationCap,
    title: "Academic Performance",
    desc: "Math, reading, and science proficiency trends with subgroup breakdowns and AI-modeled predictive insights.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance & Engagement",
    desc: "Chronic absenteeism tracking and daily attendance patterns surfaced before they impact achievement.",
  },
  {
    icon: Users,
    title: "Students & Demographics",
    desc: "Roster-level visibility into demographics, economic disadvantage, English learners, and disability status.",
  },
  {
    icon: BookOpen,
    title: "Class Management",
    desc: "Auto-schedule classes onto consistent weekly slots, auto-assign students by grade and subject with conflict-aware alternative suggestions, and print clean landscape timetables — alongside attendance, assessments, and behaviour logging.",
  },
  {
    icon: Award,
    title: "Training & Compliance",
    desc: "FERPA, security, and data-handling modules with quizzes, completion tracking, and annual refreshers.",
  },
  {
    icon: Sparkles,
    title: "Predictive Insights",
    desc: "AI-assisted forecasts flag at-risk students and project performance trajectories across cohorts.",
  },
  {
    icon: ShieldCheck,
    title: "Security & Audit",
    desc: "Role-based access, MFA, audit logging, and FERPA-Aware controls across every record and export.",
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: CRIMSON }}>
            Everything in one place
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            From state report cards to the classroom roster.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Eight connected modules share a single source of truth — no more
            switching between spreadsheets, PDFs, and siloed tools.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 transition-colors"
                style={{ backgroundColor: `${CRIMSON}12` }}
              >
                <f.icon className="w-5 h-5" style={{ color: CRIMSON }} />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}