import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";
import { KeyRound, ShieldOff, ShieldCheck, UsersRound } from "lucide-react";

export default function SystemAreaUserAccessManager({ callerCreds }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("manageSchoolStaff", { action: "list", ...callerCreds });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to load users");
      setUsers((response.data.users || []).filter((user) => ["area", "commissioner"].includes(user.role)));
    } catch (error) {
      setMessage(error.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const resetPassword = async (user) => {
    setMessage("");
    try {
      const response = await base44.functions.invoke("manageSchoolStaff", { action: "reset_password", ...callerCreds, user_id: user.id });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to reset password");
      setMessage(`Temporary password for ${user.full_name}: ${response.data.temp_password}`);
    } catch (error) {
      setMessage(error.message || "Unable to reset password.");
    }
  };

  const toggleAccess = async (user) => {
    setMessage("");
    try {
      const response = await base44.functions.invoke("manageSchoolStaff", { action: "update", ...callerCreds, user_id: user.id, active: user.active === false });
      if (!response.data?.success) throw new Error(response.data?.error || "Unable to change access");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, active: user.active === false } : item));
    } catch (error) {
      setMessage(error.message || "Unable to change access.");
    }
  };

  return (
    <SectionCard title="System & Area Users" subtitle="Reset passwords or revoke access for cross-school accounts" icon={UsersRound}>
      {message && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading users…</p> : users.length === 0 ? <p className="text-sm text-slate-400">No system or area users found.</p> : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.full_name || user.username}</p>
                <p className="text-xs text-slate-500">{user.role === "commissioner" ? "System user" : "Area user"} · {user.system_name || user.system_code} · {user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${user.active === false ? "text-rose-600" : "text-emerald-600"}`}>{user.active === false ? "Access revoked" : "Active"}</span>
                <Button variant="outline" size="sm" onClick={() => resetPassword(user)}><KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password</Button>
                <Button variant="outline" size="sm" onClick={() => toggleAccess(user)}>{user.active === false ? <><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Restore</> : <><ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke</>}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}