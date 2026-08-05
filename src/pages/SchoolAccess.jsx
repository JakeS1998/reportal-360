import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, ArrowLeft, Building2, KeyRound } from "lucide-react";

export default function SchoolAccess() {
  const [params] = useSearchParams();
  const systemCode = params.get("system") || "";
  const schoolCode = params.get("school") || "";
  const schoolName = params.get("name") || "";
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const validRes = await base44.functions.invoke("subscriberAccess", {
        action: "validate",
        schoolCode,
        accessCode,
      });
      if (!validRes.data?.valid) {
        setError(validRes.data?.error || "Invalid access code");
        return;
      }
      const dataRes = await base44.functions.invoke("fetchSchoolData", {
        system_code: systemCode,
        school_code: schoolCode,
      });
      if (dataRes.data?.error) {
        setError(dataRes.data.error);
        return;
      }
      localStorage.setItem(
        "userSession",
        JSON.stringify({
          user: { role: "subscriber", school_code: schoolCode, system_code: systemCode },
          school: dataRes.data,
        })
      );
      navigate("/overview");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to verify access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SchoolLens</h1>
          <p className="text-sm text-slate-500 mt-1">Step 2 of 2 — Enter your access code</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {schoolName || "Selected school"}
              </p>
              <p className="text-xs text-slate-400">
                System {systemCode} · School {schoolCode}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">Access Code</Label>
            <div className="relative mt-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your subscriber access code"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Provided by your SchoolLens subscription</p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Verifying..." : "Access Dashboard"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <Link
          to="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to school selection
        </Link>
      </div>
    </div>
  );
}