import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else { current += char; }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

const FIELD_MAP = {
  student_name: "student_name", name: "student_name", full_name: "student_name",
  first_name: "first_name", last_name: "last_name",
  grade: "grade_level", grade_level: "grade_level",
  homeroom: "homeroom",
  student_number: "student_number", state_student_id: "state_student_id",
  gender: "gender",
  race: "race_ethnicity", race_ethnicity: "race_ethnicity", ethnicity: "race_ethnicity",
  lunch_status: "lunch_status",
  economically_disadvantaged: "economically_disadvantaged",
  english_learner: "english_learner", ell: "english_learner",
  disability: "disability", iep: "disability",
};

function toBool(val) {
  return ["yes", "true", "1", "y"].includes(val?.toLowerCase());
}

export default function StudentImportDialog({ open, onOpenChange, schoolCode, onImported }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      const mapped = parsed.map((r) => {
        const student = { school_code: schoolCode, status: "active" };
        Object.entries(r).forEach(([key, val]) => {
          const field = FIELD_MAP[key];
          if (field) {
            if (["economically_disadvantaged", "english_learner", "disability"].includes(field)) {
              student[field] = toBool(val);
            } else { student[field] = val; }
          }
        });
        if (!student.student_name && (student.first_name || student.last_name)) {
          student.student_name = [student.first_name, student.last_name].filter(Boolean).join(" ");
        }
        return student;
      });
      setRows(mapped);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => r.student_name);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      await base44.entities.Student.bulkCreate(valid);
      setResult({ success: true, count: valid.length });
      setRows([]);
      setFileName("");
      if (onImported) onImported();
    } catch (err) {
      setResult({ success: false, error: err.message || "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (v) => {
    if (!v) { setRows([]); setFileName(""); setResult(null); }
    onOpenChange(v);
  };

  const validCount = rows.filter((r) => r.student_name).length;
  const skipCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Students from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-600 mb-1">Expected columns (first row = headers):</p>
            <p>student_name, first_name, last_name, grade_level, homeroom, student_number, state_student_id, gender, race_ethnicity, lunch_status, economically_disadvantaged, english_learner, disability</p>
          </div>

          {!result && (
            <>
              <div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> {fileName || "Choose CSV file"}
                </Button>
              </div>

              {rows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">{validCount} valid record{validCount === 1 ? "" : "s"} ready</span>
                    {skipCount > 0 && <span className="text-amber-500">{skipCount} skipped (missing name)</span>}
                  </div>
                  <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-500">Name</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-500">Grade</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-500">Homeroom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={i} className={r.student_name ? "" : "bg-rose-50"}>
                            <td className="px-3 py-2 text-slate-700">{r.student_name || <span className="text-rose-400">—</span>}</td>
                            <td className="px-3 py-2 text-slate-500">{r.grade_level || "—"}</td>
                            <td className="px-3 py-2 text-slate-500">{r.homeroom || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 10 && <p className="text-xs text-slate-400 text-center py-2">+ {rows.length - 10} more</p>}
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="text-center py-6">
              {result.success ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">{result.count} student{result.count === 1 ? "" : "s"} imported successfully</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-rose-600">{result.error}</p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => handleClose(false)} className="bg-slate-900 hover:bg-slate-800">Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={validCount === 0 || importing} className="bg-slate-900 hover:bg-slate-800">
                  {importing ? "Importing…" : `Import ${validCount} Student${validCount === 1 ? "" : "s"}`}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}