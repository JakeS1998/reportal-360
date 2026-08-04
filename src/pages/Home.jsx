import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SchoolSearch from "@/components/SchoolSearch";
import { Link } from "react-router-dom";
import { GraduationCap, BookOpen } from "lucide-react";

export default function Home() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const data = await base44.entities.School.list("-academic_score", 500);
        // Only show the most recent report year
        const latestYear = data.reduce((max, s) => {
          return s.year && (!max || s.year > max) ? s.year : max;
        }, null);
        const filtered = latestYear
          ? data.filter((s) => s.year === latestYear)
          : data;
        setSchools(filtered);
      } catch (err) {
        console.error("Failed to load schools", err);
      } finally {
        setLoading(false);
      }
    };
    loadSchools();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Alabama School Insights
              </h1>
              <p className="text-sm text-slate-500">
                Academic performance & financial data for Alabama public schools
              </p>
            </div>
          </div>
          <Link to="/management" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 shrink-0">
            <BookOpen className="w-4 h-4" /> Class Management
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : (
          <SchoolSearch schools={schools} />
        )}
      </main>
    </div>
  );
}