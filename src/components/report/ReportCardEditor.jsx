import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send, GraduationCap, Calendar } from "lucide-react";

const letterGrade = (score) => {
  if (score == null || score === "") return "";
  const n = Number(score);
  if (isNaN(n)) return "";
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "F";
};

export default function ReportCardEditor({ draft, reportId, onChange, onSave, onPublish, saving, savedStatus }) {
  if (!draft) return null;
  const { student, grades, attendance_rate, teacher_comment, term, is_homeroom_teacher } = draft;

  const updateGrade = (idx, field, value) => {
    const next = grades.map((g, i) => (i === idx ? { ...g, [field]: value } : g));
    if (field === "score") {
      next[idx].grade = letterGrade(value);
    }
    onChange({ ...draft, grades: next });
  };

  const setComment = (value) => onChange({ ...draft, teacher_comment: value });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-900">{student?.student_name}</h3>
          <p className="text-xs text-slate-500">
            Grade {student?.grade_level || "—"} {student?.homeroom ? `· ${student.homeroom}` : ""} · Term: {term || "—"}
            {is_homeroom_teacher ? " · Homeroom view (all classes)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedStatus && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${savedStatus === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {savedStatus === "published" ? "Published" : "Draft"}
            </span>
          )}
          <Button variant="outline" onClick={onSave} disabled={saving} className="border-slate-200">
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button onClick={onPublish} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            <Send className="w-4 h-4 mr-1" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Grades by Class</p>
          </div>
          {grades.length === 0 ? (
            <p className="text-xs text-slate-400">No enrolled classes found. Assign the student to classes first.</p>
          ) : (
            <div className="space-y-2">
              {grades.map((g, idx) => (
                <div key={g.class_id || idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{g.class_name || "Untitled"}</p>
                    <p className="text-[11px] text-slate-400">{g.subject || "—"}</p>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={g.score == null ? "" : g.score}
                      onChange={(e) => updateGrade(idx, "score", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Score %"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={g.grade || ""}
                      onChange={(e) => updateGrade(idx, "grade", e.target.value)}
                      placeholder="A"
                      className="h-8 text-sm uppercase"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Attendance</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {attendance_rate == null ? "—" : `${attendance_rate}%`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Auto-calculated from attendance records in scope.</p>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">Teacher Comment</Label>
        <Textarea
          value={teacher_comment || ""}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment for this report card…"
          rows={5}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}