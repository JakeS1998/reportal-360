import React from "react";
import { SlidersHorizontal } from "lucide-react";

export default function FilterBar({ school }) {
  return (
    <div className="sticky top-20 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-6 print:hidden">
      <div className="flex items-center gap-2 mb-2.5 md:mb-0">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterSelect label="School Year" value={school?.year || "2025"} options={["2025", "2024", "2023"]} />
        <Divider />
        <FilterSelect label="School" value={school?.school_name || "—"} options={[school?.school_name || "—"]} />
        <Divider />
        <FilterSelect label="Grade" value="All Grades" options={["All Grades", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]} />
        <Divider />
        <FilterSelect label="Subject" value="All Subjects" options={["All Subjects", "Math", "Reading", "Science"]} />
        <Divider />
        <FilterSelect label="Student Group" value="All Students" options={["All Students", "Economically Disadvantaged", "Students with Disabilities", "English Learners", "Homeless", "Foster", "Military Family"]} />
        <Divider />
        <FilterSelect label="Gender" value="All Gender" options={["All Gender", "Male", "Female"]} />
      </div>
    </div>
  );
}

function Divider() {
  return <span className="hidden md:inline-block w-px h-5 bg-slate-200" />;
}

function FilterSelect({ label, value, options }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</label>
      <select
        value={value}
        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 cursor-pointer transition-colors"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}