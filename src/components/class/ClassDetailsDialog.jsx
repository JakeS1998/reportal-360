import React from "react";
import { CalendarDays, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ClassDetailsDialog({ detail, onOpenChange }) {
  const schedules = [...(detail?.schedules || [])].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time));

  return (
    <Dialog open={!!detail} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{detail?.className}</DialogTitle>
        </DialogHeader>
        {detail?.loading ? <p className="text-sm text-slate-500">Loading class details…</p> : detail?.error ? <p className="text-sm text-rose-600">{detail.error}</p> : <div className="grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4" /> Meets</h3>
            {schedules.length ? <div className="space-y-2">{schedules.map((session) => <div key={session.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium text-slate-800">{session.day_of_week}</span><span className="text-slate-500"> · {session.start_time}–{session.end_time}{session.room ? ` · Room ${session.room}` : ""}</span></div>)}</div> : <p className="text-sm text-slate-500">No meeting times have been set.</p>}
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Users className="h-4 w-4" /> Enrolled students ({detail?.students.length || 0})</h3>
            {detail?.students.length ? <div className="max-h-64 space-y-1 overflow-y-auto">{detail.students.map((student) => <p key={student.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{student.student_name}</p>)}</div> : <p className="text-sm text-slate-500">No students are enrolled.</p>}
          </section>
        </div>}
      </DialogContent>
    </Dialog>
  );
}