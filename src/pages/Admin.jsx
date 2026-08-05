import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Copy, Plus, ArrowLeft, Power } from "lucide-react";

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
  const [form, setForm] = useState({
    school_code: "",
    school_name: "",
    expires_at: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me.role !== "admin") {
          navigate("/");
          return;
        }
        await loadCodes();
      } catch (err) {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [navigate]);

  const loadCodes = async () => {
    const data = await base44.entities.AccessCode.list("-created_date", 500);
    setCodes(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const code = generateCode();
      await base44.entities.AccessCode.create({
        code,
        school_code: form.school_code,
        school_name: form.school_name,
        active: true,
        expires_at: form.expires_at || null,
        notes: form.notes,
      });
      setForm({ school_code: "", school_name: "", expires_at: "", notes: "" });
      await loadCodes();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (codeRecord) => {
    await base44.entities.AccessCode.update(codeRecord.id, { active: !codeRecord.active });
    await loadCodes();
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
              <h1 className="text-2xl font-bold text-slate-900">Access Code Management</h1>
              <p className="text-sm text-slate-500">Control which schools can access the portal</p>
            </div>
          </div>
          <Button onClick={() => navigate("/schedule")} variant="outline" className="border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Schedule
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 mb-8">
          <h3 className="font-medium text-slate-900 mb-4">Generate New Access Code</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500">School Code *</Label>
              <Input required value={form.school_code} onChange={e => setForm({ ...form, school_code: e.target.value })} placeholder="e.g. 0101" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">School Name</Label>
              <Input value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} placeholder="e.g. Holly Pond Elementary" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Expires (optional)</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Paid through Dec 2025" />
            </div>
          </div>
          <Button type="submit" disabled={creating} className="bg-slate-900 hover:bg-slate-800 mt-4">
            <Plus className="w-4 h-4 mr-1" /> Generate Code
          </Button>
        </form>

        <h3 className="text-lg font-semibold text-slate-900 mb-4">Access Codes</h3>
        {codes.length === 0 ? (
          <p className="text-center text-slate-400 py-12">No access codes yet. Generate one above.</p>
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
      </main>
    </div>
  );
}