import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const escapeHtml = (value) => String(value || "—").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

export default function LessonPlanPrintButton({ plan }) {
  const printPlan = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    const fields = [["Learning objectives", plan.objectives], ["Activities", plan.activities], ["Resources and materials", plan.resources], ["Assessment and evidence", plan.assessment]];
    popup.document.write(`<html><head><title>${escapeHtml(plan.title)}</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:48px;line-height:1.5}h1{margin-bottom:4px}h2{font-size:16px;margin:28px 0 6px;border-bottom:1px solid #d1d5db;padding-bottom:6px}p{white-space:pre-wrap;margin:0}.meta{color:#6b7280}</style></head><body><h1>${escapeHtml(plan.title)}</h1><p class="meta">${escapeHtml(plan.class_name || "Class")}${plan.lesson_date ? ` · ${escapeHtml(plan.lesson_date)}` : ""}</p>${fields.map(([label, value]) => `<h2>${escapeHtml(label)}</h2><p>${escapeHtml(value)}</p>`).join("")}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return <Button type="button" variant="outline" onClick={printPlan}><Printer className="mr-1 w-4 h-4" />Print</Button>;
}