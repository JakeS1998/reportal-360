import React, { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnassignedTeacherList({ items, onAssign, assigningId }) {
  const [selected, setSelected] = useState({});
  if (!items.length) return null;
  return <section>
    <h4 className="mb-2 text-sm font-semibold text-slate-800">Classes without a qualified teacher</h4>
    <div className="space-y-2">
      {items.map((item) => <div key={item.classId} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-900">{item.name}</p>
        <p className="mb-2 text-xs text-amber-700">{item.reason}</p>
        {item.candidates.length ? <div className="flex gap-2">
          <select value={selected[item.classId] || ""} onChange={(event) => setSelected({ ...selected, [item.classId]: event.target.value })} className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm">
            <option value="">Select a qualified teacher…</option>
            {item.candidates.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
          <Button size="sm" disabled={assigningId === item.classId || !selected[item.classId]} onClick={() => onAssign(item, selected[item.classId])}><UserRound className="h-3.5 w-3.5" /> Assign</Button>
        </div> : <p className="text-xs text-amber-700">No active teacher is assigned to this subject.</p>}
      </div>)}
    </div>
  </section>;
}