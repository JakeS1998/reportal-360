import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, Search, Building2 } from "lucide-react";

export default function SelectSchool() {
  const [systemCode, setSystemCode] = useState("");
  const [schools, setSchools] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const findSchools = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSchools(null);
    setQuery("");
    try {
      const res = await base44.functions.invoke("subscriberAccess", {
        action: "schoolsBySystem",
        systemCode,
      });
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }
      setSchools(res.data?.schools || []);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load schools");
    } finally {
      setLoading(false);
    }
  };

  const pickSchool = (sc) => {
    navigate(
      `/access?system=${encodeURIComponent(systemCode)}&school=${encodeURIComponent(
        sc.school_code
      )}&name=${encodeURIComponent(sc.school_name)}`
    );
  };

  const filtered = (schools || []).filter((s) =>
    `${s.school_name} ${s.school_code}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SchoolLens</h1>
          <p className="text-sm text-slate-500 mt-1">Step 1 of 2 — Find your school</p>
        </div>

        <form onSubmit={findSchools} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">System Code</Label>
            <Input
              required
              value={systemCode}
              onChange={(e) => setSystemCode(e.target.value)}
              placeholder="e.g. 022"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Your district/system code from ALSDE</p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Searching..." : "Find Schools"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        {schools !== null && (
          <div className="bg-white mt-4 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  {schools.length} school{schools.length === 1 ? "" : "s"} found
                </p>
                <span className="text-xs text-slate-400">System {systemCode}</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter schools..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-auto">
              {filtered.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">
                  {schools.length === 0
                    ? "No schools found for this system code yet."
                    : "No matches."}
                </p>
              ) : (
                filtered.map((sc) => (
                  <button
                    key={sc.school_code}
                    onClick={() => pickSchool(sc)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{sc.school_name}</p>
                      <p className="text-xs text-slate-400">
                        Code {sc.school_code}
                        {sc.school_type ? ` · ${sc.school_type}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-4 space-y-1">
          <p className="text-xs text-slate-400">
            Data sourced from Alabama State Department of Education Report Card
          </p>
          <Link to="/admin-login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Admin login
          </Link>
        </div>
      </div>
    </div>
  );
}