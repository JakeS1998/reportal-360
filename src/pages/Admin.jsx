import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Copy, Plus, Power, LogOut, UserCog, Trash2, School as SchoolIcon, ShieldCheck, Pencil } from "lucide-react";

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
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [codes, setCodes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [codeForm, setCodeForm] = useState({ expires_at: "", notes: "" });
  const [teacherForm, setTeacherForm] = useState({ username: "", password: "", full_name: "" });
  const [creatingCode, setCreatingCode] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolForm, setSchoolForm] = useState(null);
  const [savingSchool, setSavingSchool] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session || session.user.role !== "admin") {
      navigate("/");
      return;
    }
    setUser(session.user);
    Promise.all([loadSchools(), loadCodes(), loadTeachers()]).finally(() => setLoading(false));
  }, [navigate]);

  const loadSchools = async () => {
    const data = await base44.entities.School.list("-created_date", 5000);
    // Dedupe by school_code/system_code (keep most recent)
    const seen = new Map();
    for (const s of data) {
      const key = `${s.system_code}/${s.school_code}`;
      if (!seen.has(key)) seen.set(key, s);
    }
    const unique = Array.from(seen.values()).sort((a, b) =>
      (a.school_name || "").localeCompare(b.school_name || "")
    );
    setSchools(unique);
  };

  const loadCodes = async () => {
    const data = await base44.entities.AccessCode.list("-created_date", 500);
    setCodes(data);
  };

  const loadTeachers = async () => {
    const data = await base44.entities.Teacher.list("-created_date", 500);
    setTeachers(data);
  };

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) || null,
    [schools, selectedSchoolId]
  );

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools.slice(0, 50);
    return schools
      .filter(
        (s) =>
          (s.school_name || "").toLowerCase().includes(q) ||
          (s.school_code || "").toLowerCase().includes(q) ||
          (s.system_code || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [schools, searchQuery]);

  const schoolTeachers = useMemo(() => {
    if (!selectedSchool) return [];
    return teachers.filter(
      (t) => t.school_code === selectedSchool.school_code && t.system_code === selectedSchool.system_code
    );
  }, [teachers, selectedSchool]);

  const schoolCodes = useMemo(() => {
    if (!selectedSchool) return [];
    return codes.filter((c) => c.school_code === selectedSchool.school_code);
  }, [codes, selectedSchool]);

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setCreatingCode(true);
    try {
      const code = generateCode();
      await base44.entities.AccessCode.create({
        code,
        school_code: selectedSchool.school_code,
        school_name: selectedSchool.school_name,
        active: true,
        expires_at: codeForm.expires_at || null,
        notes: codeForm.notes,
      });
      setCodeForm({ expires_at: "", notes: "" });
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
    if (!selectedSchool) return;
    setCreatingTeacher(true);
    try {
      await base44.entities.Teacher.create({
        username: teacherForm.username,
        password: teacherForm.password,
        full_name: teacherForm.full_name,
        school_code: selectedSchool.school_code,
        system_code: selectedSchool.system_code,
        school_name: selectedSchool.school_name,
      });
      setTeacherForm({ username: "", password: "", full_name: "" });
      await loadTeachers();
    } finally {
      setCreatingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    await base44.entities.Teacher.delete(teacher.id);
    await loadTeachers();
  };

  const toggleSchoolAdmin = async (teacher) => {
    const newRole = teacher.role === "school_admin" ? "teacher" : "school_admin";
    await base44.entities.Teacher.update(teacher.id, { role: newRole });
    await loadTeachers();
  };

  const openAddSchool = () => {
    setSchoolForm({
      school_name: "", school_code: "", system_code: "", system_name: "",
      city: "", grade_span: "", school_type: "", enrollment: "", year: "",
    });
  };

  const openEditSchool = () => {
    if (!selectedSchool) return;
    setSchoolForm({
      id: selectedSchool.id,
      school_name: selectedSchool.school_name || "",
      school_code: selectedSchool.school_code || "",
      system_code: selectedSchool.system_code || "",
      system_name: selectedSchool.system_name || "",
      city: selectedSchool.city || "",
      grade_span: selectedSchool.grade_span || "",
      school_type: selectedSchool.school_type || "",
      enrollment: selectedSchool.enrollment ?? "",
      year: selectedSchool.year || "",
    });
  };

  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setSavingSchool(true);
    try {
      const payload = {
        school_name: schoolForm.school_name,
        school_code: schoolForm.school_code,
        system_code: schoolForm.system_code,
        system_name: schoolForm.system_name,
        city: schoolForm.city,
        grade_span: schoolForm.grade_span,
        school_type: schoolForm.school_type || undefined,
        enrollment: schoolForm.enrollment === "" ? undefined : Number(schoolForm.enrollment),
        year: schoolForm.year,
      };
      if (schoolForm.id) {
        await base44.entities.School.update(schoolForm.id, payload);
      } else {
        await base44.entities.School.create(payload);
      }
      setSchoolForm(null);
      await loadSchools();
    } finally {
      setSavingSchool(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchool) return;
    if (!confirm(`Delete ${selectedSchool.school_name}? This cannot be undone.`)) return;
    await base44.entities.School.delete(selectedSchool.id);
    setSelectedSchoolId("");
    await loadSchools();
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
              <p className="text-sm text-slate-500">Manage teachers and access codes by school</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-slate-300">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* School search */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SchoolIcon className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-semibold text-slate-900">
                Find a School {schools.length > 0 && <span className="text-slate-400 font-normal">({schools.length})</span>}
              </h2>
            </div>
            <Button onClick={openAddSchool} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-1" /> Add School
            </Button>
          </div>
          {schools.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No schools imported yet.</p>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by school name or code…"
                className="text-base"
              />
              <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {filteredSchools.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">No matches found.</p>
                ) : (
                  filteredSchools.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSchoolId(s.id)}
                      className={`w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                        selectedSchoolId === s.id ? "bg-slate-100" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{s.school_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.system_name ? `${s.system_name} · ` : ""}
                          {s.city ? `${s.city} · ` : ""}
                          {s.grade_span ? `${s.grade_span}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{s.system_code}</code>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{s.school_code}</code>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {!searchQuery.trim() && schools.length > 50 && (
                <p className="text-xs text-slate-400 mt-2 text-center">Showing first 50 — type to search all {schools.length} schools.</p>
              )}
            </div>
          )}
        </section>

        {schoolForm && (
          <section>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-slate-900">{schoolForm.id ? "Edit School" : "Add School"}</h3>
                <button onClick={() => setSchoolForm(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSaveSchool} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">School Name *</Label>
                    <Input required value={schoolForm.school_name} onChange={e => setSchoolForm({ ...schoolForm, school_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">System Name</Label>
                    <Input value={schoolForm.system_name} onChange={e => setSchoolForm({ ...schoolForm, system_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">System Code *</Label>
                    <Input required value={schoolForm.system_code} onChange={e => setSchoolForm({ ...schoolForm, system_code: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">School Code *</Label>
                    <Input required value={schoolForm.school_code} onChange={e => setSchoolForm({ ...schoolForm, school_code: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">City</Label>
                    <Input value={schoolForm.city} onChange={e => setSchoolForm({ ...schoolForm, city: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Grade Span</Label>
                    <Input value={schoolForm.grade_span} onChange={e => setSchoolForm({ ...schoolForm, grade_span: e.target.value })} placeholder="e.g. PK-6" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">School Type</Label>
                    <select value={schoolForm.school_type} onChange={e => setSchoolForm({ ...schoolForm, school_type: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      <option value="">—</option>
                      <option value="Elementary">Elementary</option>
                      <option value="Middle">Middle</option>
                      <option value="High">High</option>
                      <option value="K-12">K-12</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Enrollment</Label>
                    <Input type="number" value={schoolForm.enrollment} onChange={e => setSchoolForm({ ...schoolForm, enrollment: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Report Year</Label>
                    <Input value={schoolForm.year} onChange={e => setSchoolForm({ ...schoolForm, year: e.target.value })} placeholder="e.g. 2024" />
                  </div>
                </div>
                <Button type="submit" disabled={savingSchool} className="bg-slate-900 hover:bg-slate-800">
                  {savingSchool ? "Saving..." : schoolForm.id ? "Save Changes" : "Create School"}
                </Button>
              </form>
            </div>
          </section>
        )}

        {selectedSchool && (
          <>
            {/* Selected school summary */}
            <section>
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Selected School</p>
                  <p className="text-xl font-semibold mt-0.5">{selectedSchool.school_name}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">System Code</p>
                    <code className="text-2xl font-mono font-bold">{selectedSchool.system_code}</code>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">School Code</p>
                    <code className="text-2xl font-mono font-bold">{selectedSchool.school_code}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={openEditSchool} variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-800">
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button onClick={handleDeleteSchool} variant="outline" size="sm" className="border-rose-500 text-rose-300 hover:bg-rose-900/40">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Teacher Accounts */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Teacher Accounts — {selectedSchool.school_name}
                </h2>
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
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Auto-assigned to {selectedSchool.school_name} · {selectedSchool.system_code}/{selectedSchool.school_code}
                </p>
                <Button type="submit" disabled={creatingTeacher} className="bg-slate-900 hover:bg-slate-800 mt-4">
                  <Plus className="w-4 h-4 mr-1" /> Add Teacher
                </Button>
              </form>
              {schoolTeachers.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No teacher accounts for this school yet.</p>
              ) : (
                <div className="space-y-2">
                  {schoolTeachers.map(t => (
                    <Card key={t.id} className="p-4 border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{t.full_name || t.username}</p>
                          <p className="text-sm text-slate-500">@{t.username}</p>
                        </div>
                        {t.role === "school_admin" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            <ShieldCheck className="w-3 h-3" /> School Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => toggleSchoolAdmin(t)} variant="outline" size="sm" className="border-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          {t.role === "school_admin" ? "Demote" : "Make Admin"}
                        </Button>
                        <Button onClick={() => handleDeleteTeacher(t)} variant="outline" size="sm" className="border-slate-300 text-rose-600 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Access Codes */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Access Codes — {selectedSchool.school_name}
                </h2>
              </div>
              <form onSubmit={handleCreateCode} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Expires (optional)</Label>
                    <Input type="date" value={codeForm.expires_at} onChange={e => setCodeForm({ ...codeForm, expires_at: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <Input value={codeForm.notes} onChange={e => setCodeForm({ ...codeForm, notes: e.target.value })} placeholder="e.g. Paid through Dec 2025" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  Auto-assigned to {selectedSchool.school_name} · {selectedSchool.school_code}
                </p>
                <Button type="submit" disabled={creatingCode} className="bg-slate-900 hover:bg-slate-800 mt-4">
                  <Plus className="w-4 h-4 mr-1" /> Generate Code
                </Button>
              </form>
              {schoolCodes.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No access codes for this school yet.</p>
              ) : (
                <div className="space-y-2">
                  {schoolCodes.map(c => (
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
          </>
        )}
      </main>
    </div>
  );
}