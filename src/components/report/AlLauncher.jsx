import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isSessionExpired } from "@/lib/authFlow";
import AskReportAL from "@/components/report/AskReportAL";

export default function AlLauncher() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    setUser(session?.user && !isSessionExpired(session) ? session.user : null);
  }, [location.pathname]);

  const publicRoutes = ["/", "/login", "/admin-login", "/reset-password", "/sso-callback", "/privacy", "/terms", "/security"];
  if (publicRoutes.includes(location.pathname) || !user || !["teacher", "manager", "area", "admin"].includes(user.role)) return null;
  return <AskReportAL user={user} />;
}