import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Coffee, UtensilsCrossed, AlertTriangle, Clock, Home } from "lucide-react";

export default function SchoolHoursDialog({ open, onOpenChange, schoolCode, onSaved }) {
  const [timetableId, setTimetableId] = useState(null);
  const [form, setForm] = useState({ school_start: "", school_end: "", homeroom_start: "", homeroom_end: "", break_start: "", break_end: "", lunch_start: "", lunch_end: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !schoolCode) return;
    setError("");
    base44.entities.SchoolTimetable.filter({ school_code: schoolCode })
      .then((rows) => {
        if (rows.length > 0) {
          setTimetableId(rows[0].id);
          setForm({
            school_start: rows[0].school_start || "",
            school_end: rows[0].school_end || "",
            homeroom_start: rows[0].homeroom_start || "",
            homeroom_end: rows[0].homeroom_end || "",
            break_start: rows[0].break_start || "",
            break_end: rows[0].break_end || "",
            lunch_start: rows[0].lunch_start || "",
            lunch_end: rows[0].lunch_end || "",
          });
        } else {
          setTimetableId(null);
          setForm({ school_start: "07:30", school_end: "15:00", homeroom_start: "07:30", homeroom_end: "07:50", break_start: "09:30", break_end: "09:45", lunch_start: "12:00", lunch_end: "12:45" });
        }
      })
      .catch(() => {});
  }, [open, schoolCode]);

  const toMin = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (form.school_start && form.school_end && toMin(form.school_end) <= toMin(form.school_start)) {
      setError("School end must be after school start."); return;
    }
    if (form.homeroom_start && form.homeroom_end && toMin(form.homeroom_end) <= toMin(form.homeroom_start)) {
      setError("Homeroom end must be after homeroom start."); return;
    }
    if (form.break_start && form.break_end && toMin(form.break_end) <= toMin(form.break_start)) {
      setError("Break end must be after break start."); return;
    }
    if (form.lunch_start && form.lunch_end && toMin(form.lunch_end) <= toMin(form.lunch_start)) {
      setError("Lunch end must be after lunch start."); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, school_code: schoolCode };
      if (timetableId) {
        await base44.entities.SchoolTimetable.update(timetableId, payload);
      } else {
        const created = await base44.entities.SchoolTimetable.create(payload);
        setTimetableId(created.id);
      }
      onSaved?.(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save school hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>School Hours &amp; Daily Times</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <p className="text-sm font-semibold text-slate-800">School Day</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Start</Label>
                <Input type="time" value={form.school_start} onChange={(e) => setForm({ ...form, school_start: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">End</Label>
                <Input type="time" value={form.school_end} onChange={(e) => setForm({ ...form, school_end: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800">Homeroom</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Start</Label>
                <Input type="time" value={form.homeroom_start} onChange={(e) => setForm({ ...form, homeroom_start: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">End</Label>
                <Input type="time" value={form.homeroom_end} onChange={(e) => setForm({ ...form, homeroom_end: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800">Morning Break</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Start</Label>
                <Input type="time" value={form.break_start} onChange={(e) => setForm({ ...form, break_start: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">End</Label>
                <Input type="time" value={form.break_end} onChange={(e) => setForm({ ...form, break_end: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800">Lunch</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Start</Label>
                <Input type="time" value={form.lunch_start} onChange={(e) => setForm({ ...form, lunch_start: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">End</Label>
                <Input type="time" value={form.lunch_end} onChange={(e) => setForm({ ...form, lunch_end: e.target.value })} className="mt-1" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">School day, homeroom, break and lunch times are shaded across the weekly grid. Break and lunch are excluded from each teacher's free-period count.</p>
          {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}