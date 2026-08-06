import React, { useState, useEffect, useCallback } from "react";
import { useSchool } from "@/lib/SchoolContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FadeIn from "@/components/FadeIn";
import SectionCard from "@/components/SectionCard";
import {
  UserPlus, Trash2, KeyRound, Copy, Check, Users, ShieldCheck, Mail,
} from "lucide-react";

const ROLE_LABELS = {
  area: "Area",
  manager: "Manager",
  teacher: "Teacher",
};

const ROLE_BADGE = {
  area: "bg-indigo-50 text-indigo-600",
  manager: "bg-blue-50 text-blue-600",
  teacher: "bg-slate-100 text-slate-600",
};

export default function StaffManagement() {
  const { user, systemSchools, school } = useSchool();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("teacher");
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const callerCreds = {
    caller_username: user?.username,
    caller_password: user?.password || localStorage.getItem("userPassword") || "",
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "list",
        ...callerCreds,
      });
      if (res.data?.success) {
        setUsers(res.data.users || []);
      } else {
        setError(res.data?.error || "Failed to load staff");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    if (!user) return;
    // Only area, manager, and admin can access
    if (!["area", "manager", "admin"].includes(user.role)) return;
    loadUsers();
    // Default school for manager is their own
    if (user.role === "manager") {
      setSchoolCode(user.school_code);
    } else if (user.role === "area" && systemSchools.length > 0) {
      setSchoolCode(systemSchools[0].school_code);
    }
  }, [user, systemSchools, loadUsers]);

  if (!user || !["area", "manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        You do not have access to this page.
      </div>
    );
  }

  const availableRoles = user.role === "admin"
    ? ["area", "manager", "teacher"]
    : user.role === "area"
      ? ["manager", "teacher"]
      : ["teacher"];

  const availableSchools = user.role === "manager"
    ? [{ school_code: user.school_code, school_name: user.school_name || school?.school_name }]
    : systemSchools;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const selectedSchool = availableSchools.find((s) => s.school_code === schoolCode);
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "create",
        ...callerCreds,
        full_name: fullName,
        role,
        school_code: schoolCode,
        system_code: user.system_code,
        school_name: selectedSchool?.school_name || "",
        system_name: user.system_name || school?.system_name || "",
        email,
      });
      if (res.data?.success) {
        setCreated({ ...res.data.user, temp_password: res.data.temp_password });
        setFullName("");
        setEmail("");
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
      if (res.data?.success) {
        loadUsers();
      } else {
        alert(res.data?.error || "Failed to delete user");
      }
    } catch (err) {
      alert("Failed to delete user");
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
        setCreated({ full_name: userName, username: users.find((u) => u.id === userId)?.username, temp_password: res.data.temp_password, isReset: true });
      } else {
        alert(res.data?.error || "Failed to reset password");
      }
    } catch (err) {
      alert("Failed to reset password");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user.role === "area" && "Create managers and teachers for schools in your system"}
            {user.role === "manager" && "Create teacher accounts for your school"}
            {user.role === "admin" && "Create and manage all user accounts"}
          </p>
        </div>
      </FadeIn>

      {created && (
        <FadeIn>
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
        </FadeIn>
      )}

      <FadeIn delay={40}>
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
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">School</Label>
                {user.role === "manager" ? (
                  <Input
                    value={user.school_name || school?.school_name || "Your school"}
                    disabled
                    className="mt-1 bg-slate-50"
                  />
                ) : (
                  <select
                    required
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>Select a school</option>
                    {availableSchools.map((s) => (
                      <option key={s.school_code} value={s.school_code}>
                        {s.school_name} ({s.school_code})
                      </option>
                    ))}
                  </select>
                )}
                {role === "area" && (
                  <p className="text-xs text-amber-600 mt-1">Area users see all schools in the system</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Email (optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="mt-1"
                />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800">
              {creating ? "Creating..." : "Create User"}
              {!creating && <UserPlus className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </SectionCard>
      </FadeIn>

      <FadeIn delay={80}>
        <SectionCard title="Staff List" subtitle={`${users.length} user${users.length === 1 ? "" : "s"}`} icon={Users}>
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
                      onClick={() => handleResetPassword(u.id, u.full_name)}
                      title="Reset password"
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.username !== user.username && (
                      <button
                        onClick={() => handleDelete(u.id, u.full_name)}
                        title="Remove user"
                        className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}