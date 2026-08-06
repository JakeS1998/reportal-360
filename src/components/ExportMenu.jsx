import React, { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";

export default function ExportMenu({ tableId, fileName = "reportal-360-export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const exportCSV = () => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = [...table.querySelectorAll("tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")].map((cell) => `"${cell.textContent.trim().replace(/"/g, '""')}"`).join(",")
    );
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportPDF = () => {
    window.print();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
          <button onClick={exportPDF} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Dashboard as PDF
          </button>
          <button onClick={exportCSV} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Table as CSV
          </button>
        </div>
      )}
    </div>
  );
}