import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function SelectSchool() {
  const [systemCode, setSystemCode] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loginRes = await base44.functions.invoke("loginUser", {
        system_code: systemCode,
        school_code: schoolCode,
        username,
        password,
      });
      if (!loginRes.data.success) {
        setError(loginRes.data.error || "Login failed");
        return;
      }
      const loggedInUser = loginRes.data.user;
      if (loggedInUser.role === "admin") {
        localStorage.setItem("userSession", JSON.stringify({ user: loggedInUser }));
        navigate("/admin");
        return;
      }
      const response = await base44.functions.invoke("fetchSchoolData", {
        system_code: systemCode,
        school_code: schoolCode,
      });
      const data = response.data;
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem("userSession", JSON.stringify({ user: loggedInUser, school: data }));
      navigate("/schedule");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Alabama School Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your credentials to access your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
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
          <div>
            <Label className="text-sm font-medium text-slate-700">School Code</Label>
            <Input
              required
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="e.g. 0101"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">Your school code from ALSDE</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Username</Label>
            <Input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Password</Label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Logging in..." : "Login"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">
          Data sourced from Alabama State Department of Education Report Card
        </p>
      </div>
    </div>
  );
}