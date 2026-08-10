import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Smile, AlertTriangle, ShieldAlert, OctagonAlert, Mail } from "lucide-react";

const INCIDENT_TYPES = [
  { key: "positive", label: "Positive", icon: Smile, active: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { key: "warning", label: "Warning", icon: AlertTriangle, active: "bg-amber-100 text-amber-700 border-amber-300" },
  { key: "minor", label: "Minor", icon: ShieldAlert, active: "bg-orange-100 text-orange-700 border-orange-300" },
  { key: "major", label: "Major", icon: OctagonAlert, active: "bg-rose-100 text-rose-700 border-rose-300" },
];

const SEVERITIES = ["low", "medium", "high"];
const INACTIVE = "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";

export default function ClassBehaviourManager({ classId, students, user, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [studentId, setStudentId] = useState(students[0]?.student_id || "");
  const [date, setDate] = useState(today);
  const [incidentType, setIncidentType] = useState("warning");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (notifyParent = false) => {
    if (!studentId || !description.trim()) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.BehaviourRecord.create({
        student_id: studentId,
        class_id: classId,
        date,
        incident_type: incidentType,
        severity,
        description: description.trim(),
        action_taken: actionTaken.trim() || undefined,
      });
      if (notifyParent) {
        const result = await base44.functions.invoke("manageParentConversations", {
          action: "incident_notification",
          student_id: studentId,
          incident_type: incidentType,
          severity,
          description: description.trim(),
          action_taken: actionTaken.trim(),
          incident_date: date,
          caller_username: user?.username,
          caller_password: user?.password || localStorage.getItem("userPassword") || "",
          caller_email: user?.email || "",
          caller_sso: Boolean(user?.sso || user?.email),
        });
        if (!result.data?.success) throw new Error(result.data?.error || "Incident was logged, but the parent could not be notified");
      }
      setDescription("");
      setActionTaken("");
      onSaved?.();
    } catch (err) {
      setError(err.message || "Unable to save incident");
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) return <p className="text-sm text-slate-400">No students to log incidents for.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-slate-500">Student *</Label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-0.5 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {students.map((sa) => (
              <option key={sa.student_id} value={sa.student_id}>{sa.student_name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5" />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-500">Incident type *</Label>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {INCIDENT_TYPES.map((t) => {
            const active = incidentType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setIncidentType(t.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${active ? t.active : INACTIVE}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-500">Severity</Label>
        <div className="flex items-center gap-2 mt-1.5">
          {SEVERITIES.map((s) => {
            const active = severity === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border capitalize transition-colors ${active ? "bg-slate-800 text-white border-slate-800" : INACTIVE}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-500">Description *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
          className="mt-0.5 min-h-[72px]"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-500">Action taken (optional)</Label>
        <Input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="e.g. Spoke with student, parent notified" className="mt-0.5" />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={save} variant="outline" disabled={saving || !studentId || !description.trim()} size="sm">
          <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Log incident"}
        </Button>
        <Button onClick={() => save(true)} disabled={saving || !studentId || !description.trim()} size="sm">
          <Mail className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Log & notify parent"}
        </Button>
      </div>
    </div>
  );
}