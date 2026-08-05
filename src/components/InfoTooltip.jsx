import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help" />
      {show && (
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-medium text-white shadow-lg z-50 leading-relaxed text-center">
          {text}
        </span>
      )}
    </span>
  );
}