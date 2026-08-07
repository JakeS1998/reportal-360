import React from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/lib/useNotifications";
import { useSchool } from "@/lib/SchoolContext";
import { AlertCircle, CheckCircle2, ClipboardCheck, Bell } from "lucide-react";

export default function Notifications() {
  const { items, loading, count } = useNotifications();
  const { isTeacher } = useSchool();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-slate-700" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">
            {isTeacher ? "Reminders for your classes today" : "Attendance reminders across your school today"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-16" />)}
        </div>
      ) : count === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">You're all caught up</p>
          <p className="text-xs text-slate-400 mt-1">No pending reminders for today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.detail}</p>
              </div>
              <Link
                to={`/classes/${n.class_id}`}
                state={{ fromClassId: n.class_id }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shrink-0"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Take attendance
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}