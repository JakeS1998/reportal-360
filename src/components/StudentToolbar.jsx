import React from "react";
import { Search, X } from "lucide-react";
import { useSchool } from "@/lib/SchoolContext";

const GRADE_OPTIONS = ["All Grades", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const GENDER_OPTIONS = ["All Gender", "Male", "Female"];
const GROUP_OPTIONS = ["All Students", "Economically Disadvantaged", "Students with Disabilities", "English Learners"];
const SUBJECT_OPTIONS = ["All Subjects", "Math", "Reading", "Science"];

export default function StudentToolbar({ search, onSearch }) {
  const { filters, setFilter } = useSchool();

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors"
        />
        {search && (
          <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <FilterSelect label="Grade" value={filters.grade} options={GRADE_OPTIONS} onChange={(v) => setFilter("grade", v)} />
      <FilterSelect label="Gender" value={filters.gender} options={GENDER_OPTIONS} onChange={(v) => setFilter("gender", v)} />
      <FilterSelect label="Group" value={filters.studentGroup} options={GROUP_OPTIONS} onChange={(v) => setFilter("studentGroup", v)} />
      <FilterSelect label="Subject" value={filters.subject} options={SUBJECT_OPTIONS} onChange={(v) => setFilter("subject", v)} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 cursor-pointer transition-colors"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}