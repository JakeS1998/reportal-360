import React from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/useNotifications";

const CRIMSON = "#9E1B32";

export default function NotificationBell() {
  const { count, loading } = useNotifications();
  return (
    <Link
      to="/notifications"
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
    </Link>
  );
}