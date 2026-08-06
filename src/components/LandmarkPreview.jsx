import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MapPin } from "lucide-react";

const CRIMSON = "#9E1B32";

const LANDMARKS = [
  { name: "Big Spring Park · Huntsville", url: "https://images.unsplash.com/photo-1670872623631-cd88b0803d58?auto=format&fit=crop&w=1200&q=80", fact: "Built around a natural spring that has flowed for over 10,000 years — the reason Huntsville was founded." },
  { name: "Gulf Shores Coast", url: "https://images.unsplash.com/photo-1574723507385-265b5635e6c4?auto=format&fit=crop&w=1200&q=80", fact: "Gulf Shores hosts the National Shrimp Festival each October, drawing over 200,000 visitors." },
  { name: "Birmingham Skyline", url: "https://images.unsplash.com/photo-1440582096070-fa5961d9d682?auto=format&fit=crop&w=1200&q=80", fact: "Founded in 1871, Birmingham grew so fast it earned the nickname 'The Magic City.'" },
  { name: "Montgomery Capitol", url: "https://images.unsplash.com/photo-1728001528593-58c93982917b?auto=format&fit=crop&w=1200&q=80", fact: "Montgomery has been Alabama's capital since 1846 and hosted the historic 1955 bus boycott." },
  { name: "U.S. Space & Rocket Center", url: "https://images.unsplash.com/photo-1605813640975-0ef0ad36826a?auto=format&fit=crop&w=1200&q=80", fact: "The Saturn V at the Space & Rocket Center is one of only three remaining and stands 363 feet tall." },
  { name: "Lake Martin", url: "https://images.unsplash.com/photo-1589747948711-64c21bee4019?auto=format&fit=crop&w=1200&q=80", fact: "With over 750 miles of shoreline, Lake Martin is one of the largest man-made lakes in the US." },
  { name: "Mobile Bay", url: "https://images.unsplash.com/photo-1551292788-2031aee091a6?auto=format&fit=crop&w=1200&q=80", fact: "Mobile Bay is famous for the 'jubilee' phenomenon, where fish and crabs swarm the shoreline at dawn." },
  { name: "Tuscaloosa", url: "https://images.unsplash.com/photo-1600388704262-530cb4af35d3?auto=format&fit=crop&w=1200&q=80", fact: "Tuscaloosa is home to the University of Alabama and the Crimson Tide football dynasty." },
];

function todayLandmark() {
  return LANDMARKS[new Date().getDate() % LANDMARKS.length];
}

export default function LandmarkPreview() {
  const [open, setOpen] = useState(false);
  const lm = todayLandmark();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Preview today's Alabama landmark"
        className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
      >
        <MapPin className="w-3 h-3" style={{ color: CRIMSON }} />
        <span className="text-[11px] font-medium text-white/70 truncate max-w-[160px]">{lm.name}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
          <DialogTitle className="sr-only">{lm.name}</DialogTitle>
          <div className="relative h-56">
            <img src={lm.url} alt={lm.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: CRIMSON }}>
                <MapPin className="w-3 h-3" /> Alabama Landmark Today
              </p>
              <h3 className="text-lg font-bold leading-tight">{lm.name}</h3>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 leading-relaxed">{lm.fact}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}