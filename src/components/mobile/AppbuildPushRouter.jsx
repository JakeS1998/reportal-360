import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppbuildWrapper } from "@/hooks/useAppbuildWrapper";

const notificationRoutes = { staff_message: "/messages", school_alert: "/messages", assignment: "/my-assignments", assignment_due: "/my-assignments", student: "/my-student", attendance: "/attendance-review", attendance_missing: "/attendance-review" };

export default function AppbuildPushRouter() {
  const navigate = useNavigate();
  const { isWrapper, capabilities, wrapper } = useAppbuildWrapper();
  useEffect(() => {
    if (!isWrapper || !capabilities.includes("push")) return undefined;
    return wrapper.push.onReceived((payload) => {
      const type = payload?.type || payload?.data?.type;
      if (notificationRoutes[type]) navigate(notificationRoutes[type]);
    });
  }, [isWrapper, capabilities, wrapper, navigate]);
  return null;
}