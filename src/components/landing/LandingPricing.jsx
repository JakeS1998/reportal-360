import React from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import AlabamaOutline from "@/components/AlabamaOutline";

const NAVY = "#0B1530";
const CRIMSON = "#9E1B32";

const PLANS = [
  {
    name: "Teacher",
    price: "$9",
    period: "/teacher / month",
    blurb: "Classroom tools for individual educators.",
    features: [
      "Class management & roster",
      "Attendance, assessment & behaviour logging",
      "Student profile views",
      "Training & compliance modules",
      "1 teacher account",
    ],
    cta: "Start with Teacher",
    featured: false,
  },
  {
    name: "School",
    price: "$2,400",
    period: "/school / year",
    blurb: "The full portal for one school.",
    features: [
      "Everything in Teacher, plus:",
      "Executive overview & accountability grades",
      "Academic, attendance & demographics analytics",
      "Predictive insights & leaderboards",
      "Staff management & role-based access",
      "Unlimited teacher accounts at one school",
      "Audit logging & FERPA-Aware controls",
    ],
    cta: "Choose School",
    featured: true,
  },
  {
    name: "District",
    price: "Custom",
    period: "multi-school",
    blurb: "District-wide rollout for systems & commissioners.",
    features: [
      "Everything in School, plus:",
      "Cross-school benchmarking & system rollups",
      "Commissioner / area-level access tier",
      "School discovery & directory sync",
      "Custom onboarding & training",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: CRIMSON }}>
            Pricing
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Simple plans that scale with your system.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Start with a single teacher, roll out to a whole school, or deploy
            across an entire district. No hidden fees.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.featured
                  ? "bg-white shadow-xl ring-2 ring-[#9E1B32] lg:-mt-4 lg:mb-4"
                  : "bg-white shadow-sm ring-1 ring-slate-200"
              }`}
              style={plan.featured ? { boxShadow: `0 20px 50px -20px ${CRIMSON}40` } : undefined}
            >
              {plan.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: CRIMSON }}
                >
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-400">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: CRIMSON }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`mt-8 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-lg transition-colors ${
                  plan.featured ? "text-white hover:opacity-90" : "text-slate-900 bg-slate-100 hover:bg-slate-200"
                }`}
                style={plan.featured ? { backgroundColor: CRIMSON } : undefined}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <AlabamaOutline className="w-4 h-4" style={{ color: CRIMSON }} />
          Need a pilot for your system? We offer 30-day trials for Alabama schools.
        </p>
      </div>
    </section>
  );
}