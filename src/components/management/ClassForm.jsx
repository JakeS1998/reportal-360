import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export default function ClassForm({ onCreated }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    class_name: "",
    school_name: "",
    grade_level: "",
    subject: "",
    teacher_name: "",
    year: "2024-2025",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.Class.create(form);
      setForm({ class_name: "", school_name: "", grade_level: "", subject: "", teacher_name: "", year: "2024-2025" });
      setShow(false);
      if (onCreated) onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} className="bg-slate-900 hover:bg-slate-800">
        <Plus className="w-4 h-4 mr-2" /> New Class
      </Button>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-slate-900">Create a New Class</h3>
        <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500">Class Name *</Label>
            <Input required value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. 7th Grade Math" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">School Name *</Label>
            <Input required value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} placeholder="e.g. Holly Pond Elementary" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Grade Level</Label>
            <Input value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 7th Grade" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Subject</Label>
            <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Teacher Name</Label>
            <Input value={form.teacher_name} onChange={e => setForm({ ...form, teacher_name: e.target.value })} placeholder="e.g. Ms. Smith" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Academic Year</Label>
            <Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2024-2025" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800">
          {loading ? "Creating..." : "Create Class"}
        </Button>
      </form>
    </div>
  );
}