import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Copy, Plus, Power, LogOut, UserCog, Trash2 } from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [codeForm, setCodeForm] = useState({ school_code: "", school_name: "", expires_at: "", notes: "" });
  const [teacherForm, setTeacherForm] = useState({ username: "", password: "", full_name: "", school_code: "", system_code: "", school_name: "" });
  const [creatingCode, setCreatingCode] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session || session.user.role !== "admin") {
      navigate("/");
      return;
    }
    setUser(session.user);
    Promise.all([loadCodes(), loadTeachers()]).finally(() => setLoading(false));
  }, [navigate]);

  const loadCodes = async () => {
    const data = await base44.entities.AccessCode.list("-created_date", 500);
    setCodes(data);
  };

  const loadTeachers = async () => {
    const data = await base44.entities.Teacher.list("-created_date", 500);
    setTeachers(data);
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCreatingCode(true);
    try {
      const code = generateCode();
      await base44.entities.AccessCode.create({
        code,
        school_code: codeForm.school_code,
        school_name: codeForm.school_name,
        active: true,
        expires_at: codeForm.expires_at || null,
        notes: codeForm.notes,
      });
      setCodeForm({ school_code: "", school_name: "", expires_at: "", notes: "" });
      await loadCodes();
    } finally {
      setCreatingCode(false);
    }
  };

  const toggleActive = async (codeRecord) => {
    await base44.entities.AccessCode.update(codeRecord.id, { active: !codeRecord.active });
    await loadCodes();
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreatingTeacher(true);
    try {
      await base44.entities.Teacher.create({
        username: teacherForm.username,
        password: teacherForm.password,
        full_name: teacherForm.full_name,
        school_code: teacherForm.school_code,
        system_code: teacherForm.system_code,
        school_name: teacherForm.school_name,
      });
      setTeacherForm({ username: "", password: "", full_name: "", school_code: "", system_code: "", school_name: "" });
      await loadTeachers();
    } finally {
      setCreatingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    await base44.entities.Teacher.delete(teacher.id);
    await loadTeachers();
  };

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Manage teacher accounts and access codes</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-slate-300">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Teacher Accounts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Teacher Accounts</h2>
          </div>
          <form onSubmit={handleCreateTeacher} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Username *</Label>
                <Input required value={teacherForm.username} onChange={e => setTeacherForm({ ...teacherForm, username: e.target.value })} placeholder="e.g. jsmith" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Password *</Label>
                <Input required value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} placeholder="e.g. Math2025" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Full Name</Label>
                <Input value={teacherForm.full_name} onChange={e => setTeacherForm({ ...teacherForm, full_name: e.target.value })} placeholder="e.g. Jane Smith" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">System Code *</Label>
                <Input required value={teacherForm.system_code} onChange={e => setTeacherForm({ ...teacherForm, system_code: e.target.value })} placeholder="e.g. 022" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">School Code *</Label>
                <Input required value={teacherForm.school_code} onChange={e => setTeacherForm({ ...teacherForm, school_code: e.target.value })} placeholder="e.g. 0101" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">School Name</Label>
                <Input value={teacherForm.school_name} onChange={e => setTeacherForm({ ...teacherForm, school_name: e.target.value })} placeholder="e.g. Holly Pond Elementary" />
              </div>
            </div>
            <Button type="submit" disabled={creatingTeacher} className="bg-slate-900 hover:bg-slate-800 mt-4">
              <Plus className="w-4 h-4 mr-1" /> Add Teacher
            </Button>
          </form>
          {teachers.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No teacher accounts yet.</p>
          ) : (
            <div className="space-y-2">
              {teachers.map(t => (
                <Card key={t.id} className="p-4 border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{t.full_name || t.username}</p>
                    <p className="text-sm text-slate-500">@{t.username} · {t.school_name || "Unnamed"} ({t.system_code}/{t.school_code})</p>
                  </div>
                  <Button onClick={() => handleDeleteTeacher(t)} variant="outline" size="sm" className="border-slate-300 text-rose-600 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Access Codes */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Access Codes</h2>
          </div>
          <form onSubmit={handleCreateCode} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-500">School Code *</Label>
                <Input required value={codeForm.school_code} onChange={e => setCodeForm({ ...codeForm, school_code: e.target.value })} placeholder="e.g. 0101" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">School Name</Label>
                <Input value={codeForm.school_name} onChange={e => setCodeForm({ ...codeForm, school_name: e.target.value })} placeholder="e.g. Holly Pond Elementary" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Expires (optional)</Label>
                <Input type="date" value={codeForm.expires_at} onChange={e => setCodeForm({ ...codeForm, expires_at: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Notes</Label>
                <Input value={codeForm.notes} onChange={e => setCodeForm({ ...codeForm, notes: e.target.value })} placeholder="e.g. Paid through Dec 2025" />
              </div>
            </div>
            <Button type="submit" disabled={creatingCode} className="bg-slate-900 hover:bg-slate-800 mt-4">
              <Plus className="w-4 h-4 mr-1" /> Generate Code
            </Button>
          </form>
          {codes.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No access codes yet.</p>
          ) : (
            <div className="space-y-2">
              {codes.map(c => (
                <Card key={c.id} className="p-4 border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{c.code}</code>
                      <button onClick={() => copyCode(c.code)} className="text-slate-400 hover:text-slate-700">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {c.school_name || "Unnamed"} · Code {c.school_code}
                      {c.expires_at && <span> · Expires {c.expires_at}</span>}
                    </p>
                    {c.notes && <p className="text-xs text-slate-400 mt-0.5">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                    <Button onClick={() => toggleActive(c)} variant="outline" size="sm" className="border-slate-300">
                      <Power className="w-3.5 h-3.5 mr-1" /> {c.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}