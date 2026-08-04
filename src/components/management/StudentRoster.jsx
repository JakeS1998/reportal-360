import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, UserPlus } from "lucide-react";

export default function StudentRoster({ classId, students, onRefresh }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await base44.entities.Student.create({
        student_name: name,
        class_id: classId,
        student_number: number,
      });
      setName("");
      setNumber("");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Student.delete(id);
    onRefresh();
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6 bg-white p-4 rounded-2xl border border-slate-200">
        <Input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
        <Input placeholder="Number (optional)" value={number} onChange={e => setNumber(e.target.value)} className="w-40" />
        <Button type="submit" disabled={loading || !name.trim()} className="bg-slate-900 hover:bg-slate-800">
          <UserPlus className="w-4 h-4 mr-1" /> Add
        </Button>
      </form>
      {students.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No students yet. Add students to start tracking.</p>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <span className="font-medium text-slate-900">{s.student_name}</span>
                {s.student_number && <span className="text-sm text-slate-400 ml-3">#{s.student_number}</span>}
              </div>
              <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}