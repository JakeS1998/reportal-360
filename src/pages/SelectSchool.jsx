import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, KeyRound, MapPin } from "lucide-react";
import { completeLogin, setTempSession } from "@/lib/authFlow";

const ALABAMA_SCENES = [
  { url: "https://images.unsplash.com/photo-1440582096070-fa5961d9d682?auto=format&fit=crop&w=1920&q=80", title: "Birmingham Skyline", location: "Birmingham, Alabama", fact: "Founded in 1871, Birmingham grew so fast it earned the nickname 'The Magic City.'" },
  { url: "https://images.unsplash.com/photo-1711048090288-1ccf17fc57a4?auto=format&fit=crop&w=1920&q=80", title: "Alabama Theatre", location: "Birmingham, Alabama", fact: "Opened in 1927 and dubbed the 'Showplace of the South,' it still hosts films and concerts." },
  { url: "https://images.unsplash.com/photo-1627063652902-a94b7d8df450?auto=format&fit=crop&w=1920&q=80", title: "Appalachian Foothills", location: "North Alabama", fact: "North Alabama marks the southern tip of the Appalachians — the oldest mountain range in North America." },
  { url: "https://images.unsplash.com/photo-1589747948711-64c21bee4019?auto=format&fit=crop&w=1920&q=80", title: "Lake Martin", location: "Central Alabama", fact: "With over 750 miles of shoreline, Lake Martin is one of the largest man-made lakes in the US." },
  { url: "https://images.unsplash.com/photo-1711048090328-1892e90ae260?auto=format&fit=crop&w=1920&q=80", title: "Archives & History Museum", location: "Montgomery, Alabama", fact: "Founded in 1901, it's the oldest state-funded archives agency in the United States." },
  { url: "https://images.unsplash.com/photo-1728001528593-58c93982917b?auto=format&fit=crop&w=1920&q=80", title: "Downtown Montgomery", location: "Montgomery, Alabama", fact: "Montgomery has been Alabama's capital since 1846 and hosted the historic 1955 bus boycott." },
  { url: "https://images.unsplash.com/photo-1574723507385-265b5635e6c4?auto=format&fit=crop&w=1920&q=80", title: "Gulf Shores Harbor", location: "Gulf Shores, Alabama", fact: "Gulf Shores hosts the National Shrimp Festival each October, drawing over 200,000 visitors." },
  { url: "https://images.unsplash.com/photo-1644578843995-b2cc1acbdf33?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Sunset", location: "Gulf Shores, Alabama", fact: "Alabama's Gulf Coast boasts 32 miles of sugar-white sand beaches along the Gulf of Mexico." },
  { url: "https://images.unsplash.com/photo-1659354264754-564df7e375da?auto=format&fit=crop&w=1920&q=80", title: "Coastal Boardwalk", location: "Gulf Shores, Alabama", fact: "Gulf State Park features over 28 miles of paved trails winding through nine distinct ecosystems." },
  { url: "https://images.unsplash.com/photo-1551292788-2031aee091a6?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Waves", location: "Gulf Shores, Alabama", fact: "The warm Gulf waters make Alabama's coast a year-round destination for fishing and water sports." },
  { url: "https://images.unsplash.com/photo-1670872623631-cd88b0803d58?auto=format&fit=crop&w=1920&q=80", title: "Big Spring Park", location: "Huntsville, Alabama", fact: "Built around a natural spring that has flowed for over 10,000 years — the reason Huntsville was founded." },
  { url: "https://images.unsplash.com/photo-1622409408503-f3ff61cc631b?auto=format&fit=crop&w=1920&q=80", title: "Huntsville Skyline", location: "Huntsville, Alabama", fact: "Huntsville is nicknamed 'The Rocket City' for its pivotal role in developing the Saturn V moon rocket." },
  { url: "https://images.unsplash.com/photo-1711048090525-807f98902860?auto=format&fit=crop&w=1920&q=80", title: "Rocket Park", location: "Huntsville, Alabama", fact: "Established in 1960 at Redstone Arsenal, it displays rockets from the early days of the US space program." },
  { url: "https://images.unsplash.com/photo-1605813640975-0ef0ad36826a?auto=format&fit=crop&w=1920&q=80", title: "Saturn V Rocket", location: "Huntsville, Alabama", fact: "The Saturn V at the Space & Rocket Center is one of only three remaining and stands 363 feet tall." },
  { url: "https://images.unsplash.com/photo-1600388704262-530cb4af35d3?auto=format&fit=crop&w=1920&q=80", title: "Historic Huntsville", location: "Huntsville, Alabama", fact: "Huntsville was the first permanent settlement in Alabama, founded in 1805 and originally named Twickenham." },
];

export default function SelectSchool() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [scene] = useState(() => ALABAMA_SCENES[Math.floor(Math.random() * ALABAMA_SCENES.length)]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (!res.data?.success) {
        setError(res.data?.error || "Invalid credentials");
        return;
      }
      const user = res.data.user;

      // Admin goes to admin panel
      if (user.role === "admin") {
        localStorage.setItem("userSession", JSON.stringify({ user }));
        navigate("/admin", { replace: true });
        return;
      }

      // First-login force reset
      if (user.password_reset_required) {
        setTempSession({ username, password });
        navigate("/reset-password", { replace: true });
        return;
      }

      // Normal login — fetch school data and enter dashboard
      await completeLogin(user);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <img
        src={scene.url}
        alt={scene.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/70" />

      <div className="absolute bottom-5 left-5 z-10 max-w-xs bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">{scene.title}</p>
            <p className="text-xs text-slate-200 leading-tight">{scene.location}</p>
          </div>
        </div>
        <p className="text-xs text-slate-200/90 leading-snug mt-2 pt-2 border-t border-white/15">{scene.fact}</p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-4 ring-1 ring-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ReportAL 360</h1>
          <p className="text-sm text-slate-200 mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur p-6 rounded-2xl border border-white/20 space-y-4 shadow-2xl">
          <div>
            <Label className="text-sm font-medium text-slate-700">Username</Label>
            <div className="relative mt-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 0101.jsavage"
                className="pl-9"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Format: schoolcode.name</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Password</Label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
          </form>

          <div className="text-center mt-4">
            <Link to="/admin-login" className="text-xs text-slate-300 hover:text-white transition-colors">
              Admin login
            </Link>
          </div>
        </div>
    </div>
  );
}