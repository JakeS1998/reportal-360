import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, UserCog, Shield } from "lucide-react";

export default function SchoolAdminPanel({ school, user }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "teacher" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "list",
        system_code: user.system_code,
        school_code: user.school_code,
      });
      if (res.data.success) {
        setStaff(res.data.teachers);
      } else {
        setError(res.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "create",
        system_code: user.system_code,
        school_code: user.school_code,
        teacher: form,
      });
      if (!res.data.success) {
        setError(res.data.error);
        return;
      }
      setForm({ username: "", password: "", full_name: "", role: "teacher" });
      await loadStaff();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create staff member");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (teacherId) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "delete",
        system_code: user.system_code,
        school_code: user.school_code,
        teacher_id: teacherId,
      });
      if (!res.data.success) {
        alert(res.data.error);
        return;
      }
      await loadStaff();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete staff member");
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <UserCog className="w-5 h-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">School Staff</h2>
      </div>

      <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-slate-500">Username *</Label>
            <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. jsmith" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Password *</Label>
            <Input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="e.g. Math2026" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Jane Smith" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="teacher">Teacher</option>
              <option value="school_admin">School Administrator</option>
            </select>
          </div>
        </div>
        <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800 mt-4">
          <Plus className="w-4 h-4 mr-1" /> Add Staff
        </Button>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <p className="text-center text-slate-400 py-8">No staff members yet.</p>
      ) : (
        <div className="space-y-2">
          {staff.map((t) => (
            <Card key={t.id} className="p-4 border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-slate-900">{t.full_name || t.username}</p>
                  <p className="text-sm text-slate-500">@{t.username}</p>
                </div>
                {t.role === "school_admin" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <Button onClick={() => handleDelete(t.id)} variant="outline" size="sm" className="border-slate-300 text-rose-600 hover:text-rose-700">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}