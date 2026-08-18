import React from "react";
import { useSchool } from "@/lib/SchoolContext";
import FadeIn from "@/components/FadeIn";
import SchoolUserManager from "@/components/SchoolUserManager";
import AccountDeletionRequests from "@/components/AccountDeletionRequests";
import MassEmailComposer from "@/components/MassEmailComposer";

export default function StaffManagement() {
  const { user, systemSchools, school } = useSchool();

  if (!user || !["area", "commissioner", "manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        You do not have access to this page.
      </div>
    );
  }

  const callerCreds = {
    caller_username: user.username,
    caller_password: user.password || localStorage.getItem("userPassword") || "",
    caller_email: user.email || "",
    caller_sso: Boolean(user.sso || user.email),
  };

  const isManager = user.role === "manager";
  const isArea = ["area", "commissioner"].includes(user.role);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isArea && "Create managers and teachers for schools in your system"}
            {isManager && "Create and manage school manager and teacher accounts for your school"}
            {user.role === "admin" && "Create and manage all user accounts"}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={40}>
        <SchoolUserManager
          callerCreds={callerCreds}
          mode={isManager ? "locked" : "select"}
          roles={isManager ? ["manager", "teacher"] : isArea ? ["manager", "teacher"] : ["area", "manager", "teacher"]}
          systemSchools={systemSchools}
          fixedSchool={
            isManager
              ? {
                  school_code: user.school_code,
                  school_name: user.school_name || school?.school_name,
                  system_code: user.system_code,
                  system_name: user.system_name || school?.system_name,
                }
              : school?.school_code
                ? {
                    school_code: school.school_code,
                    school_name: school.school_name,
                    system_code: school.system_code || user.system_code,
                    system_name: school.system_name || user.system_name,
                  }
                : null
          }
        />
        {isManager && <AccountDeletionRequests callerCreds={callerCreds} />}
        {user.role === "admin" && <MassEmailComposer callerCreds={callerCreds} />}
      </FadeIn>
    </div>
  );
}