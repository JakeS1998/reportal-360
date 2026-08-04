import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, GraduationCap, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function SchoolSearch({ schools, onSelect }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return schools.filter((s) => {
      const matchesQuery =
        !q ||
        s.school_name?.toLowerCase().includes(q) ||
        s.district?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || s.school_type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [schools, query, typeFilter]);

  const handleSelect = (school) => {
    if (onSelect) onSelect(school);
    navigate(`/school/${school.id}`);
  };

  const typeOptions = ["All", "Elementary", "Middle", "High", "K-12"];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by school name, district, or city..."
          className="pl-12 h-14 text-base bg-white border-slate-200 shadow-sm rounded-2xl"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {typeOptions.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              typeFilter === type
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No schools found. Try a different search.</p>
          </div>
        )}
        {filtered.map((school) => (
          <Card
            key={school.id}
            className="p-5 hover:shadow-md transition-all cursor-pointer border-slate-200 bg-white rounded-2xl group"
            onClick={() => handleSelect(school)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-lg group-hover:text-slate-700 transition-colors">
                  {school.school_name}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {school.district}
                  </span>
                  {school.city && <span>· {school.city}</span>}
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {school.grade_span || school.school_type}
                  </span>
                  {school.enrollment && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {school.enrollment.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {school.academic_grade && (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold bg-slate-900 text-white">
                    {school.academic_grade}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">
                    {school.academic_score}/100
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}