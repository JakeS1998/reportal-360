import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useSchool } from "@/lib/SchoolContext";
import ExportPdfButton from "@/components/ExportPdfButton";
import { exportDashboardPdf } from "@/lib/exportPdf";

export default function FilterBar({ school, contentRef }) {
  const { user, systemSchools, selectSchool, filters, setFilter } = useSchool();
  const isCommissioner = user?.role === "commissioner";
  const commissionerSchools = isCommissioner && systemSchools?.length ? systemSchools : null;
  const [exporting, setExporting] = useState(false);

  const yearOptions = school?.year
    ? [school.year, String(parseInt(school.year) - 1)].filter((y, i, arr) => y && arr.indexOf(y) === i)
    : ["2025", "2024"];

  const handleExport = async () => {
    if (!contentRef?.current || exporting) return;
    setExporting(true);
    try {
      const schoolName = (school?.school_name || "School").replace(/[^a-zA-Z0-9]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      await exportDashboardPdf(contentRef.current, `${schoolName}-performance-report-${date}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-6 print:hidden">
      <div className="flex items-center gap-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
        </div>
        <Divider />
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
        <div className="ml-auto shrink-0 pl-2.5">
          <ExportPdfButton onClick={handleExport} loading={exporting} />
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="shrink-0 w-px h-5 bg-slate-200" />;
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
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