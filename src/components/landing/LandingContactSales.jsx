import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Send, Loader2 } from "lucide-react";
import AlabamaOutline from "@/components/AlabamaOutline";

const CRIMSON = "#9E1B32";

export default function LandingContactSales() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    message: "",
  });
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("contactSales", { ...form, _hp: hp });
      if (res.data && res.data.success) {
        setDone(true);
      } else {
        setError((res.data && res.data.error) || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: CRIMSON }}>
            Contact Sales
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Let's find the right plan for your system.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Tell us about your school or district and we'll get back to you with
            pricing and a tailored demo.
          </p>
        </div>

        {done ? (
          <div className="mt-12 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-10 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: CRIMSON }} />
            <h3 className="text-xl font-semibold text-slate-900">
              Thank you — your enquiry is on its way.
            </h3>
            <p className="mt-2 text-slate-500">Our team will reach out to you shortly.</p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-12 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="cs-name">Full name *</Label>
                <Input id="cs-name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-email">Work email *</Label>
                <Input
                  id="cs-email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="cs-org">School / System</Label>
                <Input
                  id="cs-org"
                  value={form.organization}
                  onChange={update("organization")}
                  placeholder="e.g. Montgomery Public Schools"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-role">Your role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger id="cs-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Principal / Admin">Principal / Admin</SelectItem>
                    <SelectItem value="District / Commissioner">District / Commissioner</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-msg">How can we help? *</Label>
              <Textarea
                id="cs-msg"
                value={form.message}
                onChange={update("message")}
                rows={5}
                required
                placeholder="Tell us about your school or district and what you're looking for..."
              />
            </div>

            <input
              type="text"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <AlabamaOutline className="w-3.5 h-3.5" style={{ color: CRIMSON }} />
                We typically reply within one business day.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: CRIMSON }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Enquiry
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}