import React from "react";
import { Link } from "react-router-dom";
import { Bell, AlertCircle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useNotifications } from "@/lib/useNotifications";
import { useSchool } from "@/lib/SchoolContext";

const CRIMSON = "#9E1B32";

export default function NotificationBell() {
  const { items, loading, count } = useNotifications();
  const { isTeacher } = useSchool();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {!loading && count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0B1530]"
              style={{ backgroundColor: CRIMSON }}
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          <p className="text-xs text-slate-500">
            {isTeacher ? "Reminders for your classes today" : "Attendance reminders across your school today"}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-lg bg-slate-100 h-14" />)}
            </div>
          ) : count === 0 ? (
            <div className="text-center py-10 px-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">You're all caught up</p>
              <p className="text-xs text-slate-400 mt-0.5">No pending reminders for today.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {items.map((n) => (
                <div key={n.id} className="rounded-lg p-3 flex items-start gap-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.detail}</p>
                  </div>
                  <Link
                    to={`/classes/${n.class_id}`}
                    state={{ fromClassId: n.class_id }}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}