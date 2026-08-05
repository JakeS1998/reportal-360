import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import {
  KeyRound, Plus, RefreshCw, Trash2, Power, Copy, Check, Building2, School as SchoolIcon,
} from "lucide-react";

const CREDS = { username: "BRGAdmin", password: "BRGAdmin" };

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AccessCodeManager() {
  const [codes, setCodes] = useState(null);
  const [systems, setSystems] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({ scope: "school", systemCode: "", schoolCode: "", schoolName: "", systemName: "", code: randomCode(), expires_at: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  const loadCodes = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("manageAccessCodes", { action: "list", ...CREDS });
      if (!res.data?.error) setCodes(res.data?.codes || []);
    } catch {}
  }, []);

  const loadSystems = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("masterListApi", { resource: "systems", ...CREDS });
      if (!res.data?.error) setSystems(res.data?.systems || []);
    } catch {}
  }, []);

  useEffect(() => { loadCodes(); loadSystems(); }, [loadCodes, loadSystems]);

  const pickSystem = async (systemCode) => {
    const sys = systems.find((s) => s.system_code === systemCode);
    setForm((f) => ({ ...f, systemCode, systemName: sys?.district_name || "", schoolCode: "", schoolName: "" }));
    setSchools([]);
    if (!systemCode) return;
    try {
      const res = await base44.functions.invoke("masterListApi", { resource: "schoolsBySystem", systemCode, ...CREDS });
      setSchools(res.data?.schools || []);
    } catch {}
  };

  const pickSchool = (schoolCode) => {
    const sc = schools.find((s) => s.school_code === schoolCode);
    setForm((f) => ({ ...f, schoolCode, schoolName: sc?.school_name || "" }));
  };

  const switchScope = (scope) => {
    setForm((f) => ({ ...f, scope, schoolCode: "", schoolName: "", systemName: "" }));
    setSchools([]);
  };

  const create = async (e) => {
    e.preventDefault();
    if (form.scope === "school" && (!form.systemCode || !form.schoolCode || !form.code)) return;
    if (form.scope === "system" && (!form.systemCode || !form.code)) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        action: "create",
        scope: form.scope,
        code: form.code.trim().toUpperCase(),
        expires_at: form.expires_at || null,
        notes: form.notes || null,
        ...CREDS,
      };
      if (form.scope === "system") {
        payload.system_code = form.systemCode;
        payload.system_name = form.systemName;
      } else {
        payload.school_code = form.schoolCode;
        payload.school_name = form.schoolName;
      }
      const res = await base44.functions.invoke("manageAccessCodes", payload);
      if (res.data?.error) { setError(res.data.error); return; }
      setForm({ scope: "school", systemCode: "", schoolCode: "", schoolName: "", systemName: "", code: randomCode(), expires_at: "", notes: "" });
      setSchools([]);
      loadCodes();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create code");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    try {
      await base44.functions.invoke("manageAccessCodes", { action: "deactivate", id, ...CREDS });
      loadCodes();
    } catch {}
  };

  const remove = async (id) => {
    try {
      await base44.functions.invoke("manageAccessCodes", { action: "delete", id, ...CREDS });
      loadCodes();
    } catch {}
  };

  const copy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <SectionCard title="Access Codes" subtitle="Generate and manage subscriber and system commissioner access codes" icon={KeyRound}>
      <form onSubmit={create} className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-100">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">Scope</p>
          <button
            type="button"
            onClick={() => switchScope("school")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              form.scope === "school" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SchoolIcon className="w-3.5 h-3.5" /> School
          </button>
          <button
            type="button"
            onClick={() => switchScope("system")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              form.scope === "system" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> System Commissioner
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600">System</Label>
            <select
              value={form.systemCode}
              onChange={(e) => pickSystem(e.target.value)}
              required
              className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Select system…</option>
              {systems.map((s) => (
                <option key={s.system_code} value={s.system_code}>
                  {s.system_code} · {s.district_name}
                </option>
              ))}
            </select>
          </div>
          {form.scope === "school" && (
            <div>
              <Label className="text-xs text-slate-600">School</Label>
              <select
                value={form.schoolCode}
                onChange={(e) => pickSchool(e.target.value)}
                required
                disabled={!schools.length}
                className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              >
                <option value="">{schools.length ? "Select school…" : "Pick a system first"}</option>
                {schools.map((s) => (
                  <option key={s.school_code} value={s.school_code}>
                    {s.school_code} · {s.school_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Access Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Code"
                className="font-mono uppercase"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, code: randomCode() }))} title="Generate">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Expires (optional)</Label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. 2026 subscription"
              className="mt-1"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-1" /> {saving ? "Creating…" : `Create ${form.scope === "system" ? "System" : "School"} Access Code`}
        </Button>
      </form>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Existing codes</p>
          <Button variant="ghost" size="sm" onClick={loadCodes}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
        {codes === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-slate-400">No access codes yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {codes.map((c) => {
              const expired = c.expires_at && new Date(c.expires_at) < new Date();
              const isSystem = c.scope === "system";
              return (
                <div key={c.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {isSystem ? <Building2 className="w-4 h-4 text-slate-500" /> : <SchoolIcon className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 text-sm">{c.code}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSystem ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"}`}>
                        {isSystem ? "System" : "School"}
                      </span>
                      <button onClick={() => copy(c.code)} className="text-slate-400 hover:text-slate-700">
                        {copied === c.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {isSystem
                        ? `${c.system_name || `System ${c.system_code}`}${c.notes ? ` · ${c.notes}` : ""}`
                        : `${c.school_name || `School ${c.school_code}`}${c.notes ? ` · ${c.notes}` : ""}`}
                      {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      !c.active ? "bg-slate-100 text-slate-400" : expired ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {!c.active ? "Inactive" : expired ? "Expired" : "Active"}
                    </span>
                    {c.active && (
                      <Button variant="ghost" size="icon" onClick={() => deactivate(c.id)} title="Deactivate">
                        <Power className="w-4 h-4 text-amber-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}