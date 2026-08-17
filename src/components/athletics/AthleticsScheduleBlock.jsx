import React from "react";

export default function AthleticsScheduleBlock({ event, style, detail }) {
  return <div className="absolute rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-left text-[10px] leading-tight text-rose-800" style={style} title={`${event.title} · ${event.out_of_class_start}–${event.out_of_class_end}`}><p className="font-semibold truncate">{event.title}</p><p className="truncate">Athletics absence</p>{detail && <p className="truncate opacity-80">{detail}</p>}</div>;
}