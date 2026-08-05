import React, { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { generateStudentProgress, scoreToGrade } from "@/lib/sampleStudentData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const SUBJECT_COLORS = { Math: "#1D4ED8", Reading: "#7C3AED", Science: "#10B981" };

function gradeStyle(grade) {
  switch (grade) {
    case "A": return "bg-emerald-100 text-emerald-700";
    case "B": return "bg-blue-100 text-blue-700";
    case "C": return "bg-amber-100 text-amber-700";
    case "D": return "bg-orange-100 text-orange-700";
    case "F": return "bg-rose-100 text-rose-700";
    default: return "bg-slate-100 text-slate-500";
  }
}

function DeltaIcon({ delta }) {
  if (delta > 2) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (delta < -2) return <TrendingDown className="w-3.5 h-3.5 text-rose-600" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function Badge({ children, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${colors[color] || colors.slate}`}>{children}</span>;
}

export default function StudentProgressSheet({ student, onClose }) {
  const progress = useMemo(() => student ? generateStudentProgress(student) : null, [student]);

  const chartData = useMemo(() => {
    if (!progress) return [];
    return ["Q1", "Q2", "Q3", "Q4"].map((p, i) => {
      const row = { period: p };
      progress.scoreTrend.forEach((s) => { row[s.subject] = s.data[i].score; });
      return row;
    });
  }, [progress]);

  if (!student || !progress) return null;

  return (
    <Sheet open={!!student} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{student.student_name}</SheetTitle>
          <SheetDescription>Student progress · FY 2026</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge color="slate">ID: {student.student_number}</Badge>
            <Badge color="slate">Grade {student.grade_level}</Badge>
            <Badge color="slate">{student.gender}</Badge>
            <Badge color="slate">{student.race_ethnicity}</Badge>
            {student.economically_disadvantaged && <Badge color="amber">Econ Disadv</Badge>}
            {student.english_learner && <Badge color="blue">ELL</Badge>}
            {student.disability && <Badge color="purple">SWD</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {progress.scoreTrend.map((s) => {
              const q4 = s.data[3].score;
              const q1 = s.data[0].score;
              const delta = q4 - q1;
              const grade = scoreToGrade(q4);
              return (
                <div key={s.subject} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{s.subject}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{q4}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeStyle(grade)}`}>{grade}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                    <DeltaIcon delta={delta} />
                    <span>{delta > 0 ? "+" : ""}{delta} from Q1</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Score Trend</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {["Math", "Reading", "Science"].map((subj) => (
                  <Line key={subj} type="monotone" dataKey={subj} stroke={SUBJECT_COLORS[subj]} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Attendance Trend</h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={progress.attendanceTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="rate" stroke="#F59E0B" fill="#FEF3C7" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}