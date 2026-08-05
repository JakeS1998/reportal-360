import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useSchool } from "@/lib/SchoolContext";

export default function FilterBar({ school }) {
  const { user, systemSchools, selectSchool, filters, setFilter } = useSchool();
  const isCommissioner = user?.role === "commissioner";
  const commissionerSchools = isCommissioner && systemSchools?.length ? systemSchools : null;

  const yearOptions = school?.year
    ? [school.year, String(parseInt(school.year) - 1)].filter((y, i, arr) => y && arr.indexOf(y) === i)
    : ["2025", "2024"];

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-6 print:hidden">
      <div className="flex items-center gap-2 mb-2.5 md:mb-0">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterSelect
          label="School Year"
          value={isCommissioner ? filters.year : (school?.year || "2025")}
          options={yearOptions}
          onChange={isCommissioner ? (val) => setFilter("year", val) : null}
        />
        <Divider />
        <FilterSelect
          label="School"
          value={commissionerSchools ? (school?.school_code === "0000" ? "All Schools" : school?.school_name || "—") : school?.school_name || "—"}
          options={commissionerSchools ? ["All Schools", ...commissionerSchools.map((s) => s.school_name)] : [school?.school_name || "—"]}
          onChange={commissionerSchools ? (val) => {
            if (val === "All Schools") {
              selectSchool("0000");
              return;
            }
            const sc = commissionerSchools.find((s) => s.school_name === val);
            if (sc) selectSchool(sc.school_code);
          } : null}
        />
        <Divider />
        <FilterSelect
          label="Grade"
          value={isCommissioner ? filters.grade : "All Grades"}
          options={["All Grades", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]}
          onChange={isCommissioner ? (val) => setFilter("grade", val) : null}
        />
        <Divider />
        <FilterSelect
          label="Subject"
          value={isCommissioner ? filters.subject : "All Subjects"}
          options={["All Subjects", "Math", "Reading", "Science"]}
          onChange={isCommissioner ? (val) => setFilter("subject", val) : null}
        />
        <Divider />
        <FilterSelect
          label="Student Group"
          value={isCommissioner ? filters.studentGroup : "All Students"}
          options={["All Students", "Economically Disadvantaged", "Students with Disabilities", "English Learners", "Homeless", "Foster", "Military Family"]}
          onChange={isCommissioner ? (val) => setFilter("studentGroup", val) : null}
        />
        <Divider />
        <FilterSelect
          label="Gender"
          value={isCommissioner ? filters.gender : "All Gender"}
          options={["All Gender", "Male", "Female"]}
          onChange={isCommissioner ? (val) => setFilter("gender", val) : null}
        />
      </div>
    </div>
  );
}

function Divider() {
  return <span className="hidden md:inline-block w-px h-5 bg-slate-200" />;
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={!onChange}
        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 cursor-pointer transition-colors disabled:cursor-default"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}