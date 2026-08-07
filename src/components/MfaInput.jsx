import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, RotateCcw, ChevronLeft } from "lucide-react";

export default function MfaInput({ emailHint, deliveryWarning, onVerify, onResend, onCancel, loading, error }) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length === 6) onVerify(code);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Verification Code</h2>
        <p className="text-sm text-slate-500 mt-1">
          We sent a 6-digit code to <span className="font-medium text-slate-700">{emailHint}</span>
        </p>
        {deliveryWarning && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3 text-left">
            We couldn't deliver the code by email. Please contact your administrator — the email sender domain may not be verified.
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Enter Code</Label>
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
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={loading || code.length !== 6} className="w-full bg-slate-900 hover:bg-slate-800">
          {loading ? "Verifying..." : "Verify & Continue"}
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