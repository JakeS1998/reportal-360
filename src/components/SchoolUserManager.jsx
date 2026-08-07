import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus, Trash2, KeyRound, Copy, Check, Users, Search, Pencil,
  School as SchoolIcon, X,
} from "lucide-react";

const ROLE_LABELS = { area: "Area", manager: "Manager", teacher: "Teacher", school_admin: "School Admin" };
const ROLE_BADGE = {
  area: "bg-indigo-50 text-indigo-600",
  manager: "bg-blue-50 text-blue-600",
  teacher: "bg-slate-100 text-slate-600",
  school_admin: "bg-violet-50 text-violet-600",
};

export default function SchoolUserManager({
  callerCreds,
  mode = "locked",
  roles = ["teacher"],
  systemSchools = [],
  fixedSchool = null,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const [selectedSchool, setSelectedSchool] = useState(fixedSchool);
  const [searchQuery, setSearchQuery] = useState("");
  const [allSchools, setAllSchools] = useState([]);
  const [allSystems, setAllSystems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "", email: "", subject: "", room: "", department: "", job_title: "", role: "teacher", active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Subject.list("name", 200).then(setSubjects).catch(() => {});
  }, []);

  const roomsFor = (subjName) => (subjects.find((s) => s.name === subjName)?.rooms) || [];

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pw);
  };

  useEffect(() => {
    if (mode !== "search") return;
    setSearchLoading(true);
    Promise.all([
      base44.functions.invoke("masterListApi", { resource: "schools", ...callerCreds }),
      base44.functions.invoke("masterListApi", { resource: "systems", ...callerCreds }),
    ])
      .then(([schoolsRes, systemsRes]) => {
        setAllSchools(schoolsRes.data?.schools || []);
        setAllSystems(systemsRes.data?.systems || []);
      })
      .catch(() => {})
      .finally(() => setSearchLoading(false));
  }, [mode]);

  useEffect(() => {
    if (mode !== "search") return;
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchResults(
      allSchools
        .filter(
          (s) =>
            s.school_name?.toLowerCase().includes(q) ||
            s.school_code?.toLowerCase().includes(q) ||
            s.system_code?.toLowerCase().includes(q)
        )
        .slice(0, 30)
    );
  }, [searchQuery, allSchools, mode]);

  const getSystemName = (systemCode) =>
    allSystems.find((s) => s.system_code === systemCode)?.district_name || "";

  const loadUsers = useCallback(async () => {
    if (!selectedSchool?.system_code || !selectedSchool?.school_code) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "list",
        ...callerCreds,
        system_code: selectedSchool.system_code,
        school_code: selectedSchool.school_code,
      });
      if (res.data?.success) setUsers(res.data.users || []);
      else setError(res.data?.error || "Failed to load staff");
    } catch {
      setError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [selectedSchool, callerCreds.caller_username]);

  useEffect(() => {
    if (selectedSchool) loadUsers();
  }, [selectedSchool, loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "create",
        ...callerCreds,
        full_name: fullName,
        role,
        school_code: selectedSchool.school_code,
        system_code: selectedSchool.system_code,
        school_name: selectedSchool.school_name,
        system_name: selectedSchool.system_name || getSystemName(selectedSchool.system_code),
        email,
        subject,
        room,
        username: username || undefined,
        password: password || undefined,
      });
      if (res.data?.success) {
        setCreated({ ...res.data.user, temp_password: res.data.temp_password });
        setFullName("");
        setEmail("");
        setUsername("");
        setPassword("");
        setSubject("");
        setRoom("");
        loadUsers();
      } else {
        setError(res.data?.error || "Failed to create user");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Remove ${userName}? This cannot be undone.`)) return;
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "delete",
        ...callerCreds,
        user_id: userId,
      });
      if (res.data?.success) loadUsers();
      else alert(res.data?.error || "Failed to delete user");
    } catch (err) {
      alert(err?.response?.data?.error || err?.data?.error || err?.message || "Failed to delete user");
    }
  };

  const handleResetPassword = async (userId, userName) => {
    if (!confirm(`Generate a new temporary password for ${userName}?`)) return;
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "reset_password",
        ...callerCreds,
        user_id: userId,
      });
      if (res.data?.success) {
        setCreated({
          full_name: userName,
          username: users.find((u) => u.id === userId)?.username,
          temp_password: res.data.temp_password,
          isReset: true,
        });
      } else {
        alert(res.data?.error || "Failed to reset password");
      }
    } catch {
      alert("Failed to reset password");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "update",
        ...callerCreds,
        user_id: editingUser.id,
        ...editForm,
      });
      if (res.data?.success) {
        setEditingUser(null);
        loadUsers();
      } else {
        setError(res.data?.error || "Failed to update user");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSchoolSelector = () => {
    if (mode === "locked") {
      return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <SchoolIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{selectedSchool?.school_name}</p>
            <p className="text-xs text-slate-500">Code {selectedSchool?.school_code} · System {selectedSchool?.system_code}</p>
          </div>
        </div>
      );
    }
    if (mode === "select") {
      return (
        <div>
          <Label className="text-sm font-medium text-slate-700">Select School</Label>
          <select
            value={selectedSchool?.school_code || ""}
            onChange={(e) => {
              const sc = systemSchools.find((s) => s.school_code === e.target.value);
              setSelectedSchool(sc ? { ...sc, system_name: getSystemName(sc.system_code) } : null);
            }}
            className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select a school…</option>
            {systemSchools.map((s) => (
              <option key={s.school_code} value={s.school_code}>
                {s.school_name} ({s.school_code})
              </option>
            ))}
          </select>
        </div>
      );
    }
    // search mode
    if (selectedSchool) {
      return (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <SchoolIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{selectedSchool.school_name}</p>
            <p className="text-xs text-slate-500">Code {selectedSchool.school_code} · System {selectedSchool.system_code}</p>
          </div>
          <button
            onClick={() => setSelectedSchool(null)}
            className="p-2 rounded-lg text-slate-400 hover:bg-blue-100 hover:text-slate-600 transition-colors shrink-0"
            title="Change school"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return (
      <div>
        <Label className="text-sm font-medium text-slate-700">Search for a School</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by school name or code…"
            className="pl-10"
          />
        </div>
        {searchLoading && <p className="text-xs text-slate-400 mt-1">Loading school directory…</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {searchResults.map((s) => (
              <button
                key={s.school_key}
                onClick={() => {
                  setSelectedSchool({ ...s, system_name: getSystemName(s.system_code) });
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <SchoolIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.school_name}</p>
                  <p className="text-xs text-slate-400">Code {s.school_code} · System {s.system_code}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {searchQuery && searchResults.length === 0 && !searchLoading && (
          <p className="text-xs text-slate-400 mt-2">No schools found. Try a different search.</p>
        )}
      </div>
    );
  };

  const canCreate = selectedSchool && (mode !== "search" || selectedSchool);

  return (
    <div className="space-y-6">
      {created && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">
                {created.isReset ? "Password Reset" : "User Created"}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                {created.isReset
                  ? `New temporary password for ${created.full_name}:`
                  : `Share these credentials with ${created.full_name}:`}
              </p>
              <div className="mt-3 space-y-2">
                {created.username && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-100">
                    <span className="text-xs text-slate-400">Username:</span>
                    <code className="text-sm font-mono text-slate-800 flex-1">{created.username}</code>
                    <button onClick={() => copyToClipboard(created.username)} className="text-slate-400 hover:text-slate-600">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-100">
                  <span className="text-xs text-slate-400">Password:</span>
                  <code className="text-sm font-mono text-slate-800 flex-1">{created.temp_password}</code>
                  <button onClick={() => copyToClipboard(created.temp_password)} className="text-slate-400 hover:text-slate-600">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                The user will be asked to set a new password on first login.
              </p>
              <button onClick={() => setCreated(null)} className="text-xs text-emerald-700 underline mt-2">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard title="School" subtitle="Select the school to manage staff" icon={SchoolIcon}>
        {renderSchoolSelector()}
      </SectionCard>

      {canCreate && (
        <SectionCard title="Create New User" subtitle="Generate credentials with a random temporary password" icon={UserPlus}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">Full Name</Label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Savage"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Username auto-generated as schoolcode.name</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                {role === "area" && (
                  <p className="text-xs text-amber-600 mt-1">Area users see all schools in the system</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Username (optional)</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Auto-generated as schoolcode.name"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Leave blank to auto-generate</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Password (optional)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Auto-generated"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={genPassword} title="Generate random password">
                    <KeyRound className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Leave blank to auto-generate</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-slate-700">Email <span className="text-rose-500">*</span></Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Required for MFA verification codes</p>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Subject</Label>
                  <select
                    value={subject}
                    onChange={(e) => { setSubject(e.target.value); setRoom(""); }}
                    className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select a subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Used to match teachers to classes with the same subject</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Assigned Room</Label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    disabled={roomsFor(subject).length === 0}
                    className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                  >
                    <option value="">{roomsFor(subject).length === 0 ? "No rooms for subject" : "Select a room…"}</option>
                    {roomsFor(subject).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Used as the default room for scheduled classes</p>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800">
              {creating ? "Creating..." : "Create User"}
              {!creating && <UserPlus className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </SectionCard>
      )}

      {selectedSchool && (
        <SectionCard title="Staff List" subtitle={`${users.length} user${users.length === 1 ? "" : "s"} at ${selectedSchool.school_name}`} icon={Users}>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-14" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No staff members yet.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-500">
                      {(u.full_name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || "—"}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_BADGE[u.role] || ""}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                      {u.password_reset_required && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                          Reset pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {u.username}
                      {u.school_name ? ` · ${u.school_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setError("");
                        setEditingUser(u);
                        setEditForm({
                          full_name: u.full_name || "",
                          email: u.email || "",
                          subject: u.subject || "",
                          room: u.room || "",
                          department: u.department || "",
                          job_title: u.job_title || "",
                          role: u.role || "teacher",
                          active: u.active !== false,
                        });
                      }}
                      title="Edit user"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(u.id, u.full_name)}
                      title="Reset password"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.full_name)}
                      title="Remove user"
                      className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Email <span className="text-rose-500">*</span></Label>
              <Input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Subject</Label>
              <select
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value, room: "" })}
                className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Assigned Room</Label>
              <select
                value={editForm.room}
                onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                disabled={roomsFor(editForm.subject).length === 0}
                className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              >
                <option value="">{roomsFor(editForm.subject).length === 0 ? "No rooms for subject" : "Select a room…"}</option>
                {roomsFor(editForm.subject).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">Department</Label>
                <Input
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Job Title</Label>
                <Input
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Role</Label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {Array.from(new Set([...roles, ...(editingUser ? [editingUser.role] : [])])).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Status</Label>
                <select
                  value={editForm.active ? "true" : "false"}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.value === "true" })}
                  className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}