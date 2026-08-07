import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockKeyhole, ArrowRight, RotateCcw, ChevronLeft } from "lucide-react";

export default function DormantUnlockInput({ emailHint, onVerify, onResend, onCancel, loading, error }) {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");
    if (code.length !== 6) {
      setLocalError("Enter the 6-digit code sent to your email.");
      return;
    }
    if (newPassword.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    onVerify(code, newPassword);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
          <LockKeyhole className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Account Reactivation</h2>
        <p className="text-sm text-slate-500 mt-1">
          Your account has been inactive for 180 days and was locked for security. Enter the code sent to{" "}
          <span className="font-medium text-slate-700">{emailHint}</span> and choose a new password to reactivate.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Verification Code</Label>
          <Input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="mt-1 text-center text-2xl tracking-[0.5em] font-semibold"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">New Password</Label>
          <Input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters, incl. uppercase, number & symbol"
            className="mt-1"
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Confirm New Password</Label>
          <Input
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="mt-1"
            autoComplete="new-password"
          />
        </div>
        {(localError || error) && <p className="text-sm text-rose-600">{localError || error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
          {loading ? "Reactivating..." : "Reactivate & Sign In"}
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </form>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-slate-500">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onResend} disabled={loading} className="text-slate-500">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Resend code
        </Button>
      </div>
    </div>
  );
}