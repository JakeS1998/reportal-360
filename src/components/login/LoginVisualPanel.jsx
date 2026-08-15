import React, { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import { MapPin } from "lucide-react";

export default function LoginVisualPanel({ scenes }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * scenes.length));
  useEffect(() => { const interval = setInterval(() => setIndex((current) => (current + 1) % scenes.length), 7000); return () => clearInterval(interval); }, [scenes.length]);
  const scene = scenes[index];
  return <aside className="relative hidden min-h-[640px] overflow-hidden rounded-[1.75rem] lg:block"><Image src={scene.url} alt={scene.title} className="absolute inset-0 h-full w-full" fittingType="fill" /><div className="absolute inset-0 bg-slate-950/45" /><div className="relative flex h-full flex-col justify-between p-9 text-white"><div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur"><MapPin className="h-3.5 w-3.5" />{scene.location}</div><div><div className="border-t border-white/25 pt-4"><p className="text-sm font-semibold">{scene.title}</p><p className="mt-1 max-w-md text-sm leading-6 text-white/80">{scene.fact}</p></div><div className="mt-6 flex gap-1.5">{scenes.slice(0, 4).map((_, dot) => <span key={dot} className={`h-1.5 rounded-full ${index % 4 === dot ? "w-6 bg-white" : "w-1.5 bg-white/45"}`} />)}</div></div></div></aside>;
}