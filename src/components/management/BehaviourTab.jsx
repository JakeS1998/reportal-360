import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const TYPE_STYLES = {
  positive: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  minor: "bg-orange-100 text-orange-700",
  major: "bg-rose-100 text-rose-700",
};

const SEVERITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

export default function BehaviourTab({ classId, students }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    date: new Date().toISOString().split("T")[0],
    incident_type: "positive",
    severity: "low",
    description: "",
    action_taken: "",
  });

  const load = async () => {
    try {
      const data = await base44.entities.BehaviourRecord.filter({ class_id: classId }, "-date", 500);
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [classId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.BehaviourRecord.create({ ...form, class_id: classId });
      setForm({ ...form, description: "", action_taken: "" });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const studentName = (id) => students.find(s => s.id === id)?.student_name || "Unknown";

  const summary = ["positive", "warning", "minor", "major"].map(t => ({
    type: t,
    count: records.filter(r => r.incident_type === t).length,
  }));

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap">
        {summary.map(s => (
          <div key={s.type} className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[s.type]}`}>{s.type}</span>
            <strong className="text-slate-900">{s.count}</strong>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl border border-slate-200 mb-6">
        <h3 className="font-medium text-slate-900 mb-4">Log Behaviour Incident</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs text-slate-500">Student</Label>
            <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="">Select...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Incident Type</Label>
            <select value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white capitalize">
              <option value="positive">Positive</option>
              <option value="warning">Warning</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Severity</Label>
            <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white capitalize">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <Label className="text-xs text-slate-500">Description</Label>
          <textarea placeholder="What happened?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="mb-3">
          <Label className="text-xs text-slate-500">Action Taken</Label>
          <Input placeholder="e.g. Spoken to student" value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} />
        </div>
        <Button type="submit" disabled={loading || !form.student_id || !form.description} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-1" /> Log Incident
        </Button>
      </form>

      {records.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No behaviour records yet.</p>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">{studentName(r.student_id)}</span>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[r.incident_type]}`}>{r.incident_type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SEVERITY_STYLES[r.severity]}`}>{r.severity}</span>
                  <span className="text-xs text-slate-400">{r.date}</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{r.description}</p>
              {r.action_taken && <p className="text-xs text-slate-400 mt-1">Action: {r.action_taken}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}