import React, { useState } from "react";
import { Image } from "@/components/ui/image";
import { MapPin } from "lucide-react";

export default function LoginVisualPanel({ scenes }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * scenes.length));
  const scene = scenes[index];
  return <aside className="relative hidden min-h-[640px] overflow-hidden rounded-[1.75rem] lg:block"><Image src={scene.url} alt={scene.title} className="absolute inset-0 h-full w-full object-cover" fittingType="fill" /><div className="absolute inset-0 bg-slate-950/45" /><div className="relative flex h-full flex-col justify-between p-9 text-white"><div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur"><MapPin className="h-3.5 w-3.5" />{scene.location}</div><div className="rounded-xl border border-white/25 bg-slate-950/30 p-4 backdrop-blur-sm"><div><p className="text-sm font-semibold text-white">{scene.title}</p><p className="mt-1 max-w-md text-sm leading-6 text-white/90">{scene.fact}</p></div></div></div></aside>;
}