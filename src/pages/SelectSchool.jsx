import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, KeyRound, MapPin, ShieldCheck, Lock, FileCheck } from "lucide-react";
import MfaInput from "@/components/MfaInput";
import { completeLogin, setTempSession } from "@/lib/authFlow";
import Logo from "@/components/Logo";

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
  const [mfaRequired, setMfaRequired] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const navigate = useNavigate();
  const [scene] = useState(() => ALABAMA_SCENES[Math.floor(Math.random() * ALABAMA_SCENES.length)]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (res.data?.mfa_required) {
        setMfaRequired(true);
        setEmailHint(res.data.email_hint || "your email");
        return;
      }
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

  const handleMfaVerify = async (code) => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password, mfa_code: code });
      if (res.data?.mfa_required) {
        setError("Invalid or expired code. Please try again.");
        return;
      }
      if (!res.data?.success) {
        setError(res.data?.error || "Verification failed");
        return;
      }
      const user = res.data.user;
      if (user.password_reset_required) {
        setTempSession({ username, password });
        navigate("/reset-password", { replace: true });
        return;
      }
      await completeLogin(user);
      navigate("/overview", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to verify");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaResend = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (res.data?.mfa_required) {
        setEmailHint(res.data.email_hint || "your email");
      }
    } catch {
      setError("Unable to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setEmailHint("");
    setError("");
  };

  const handleMicrosoftSSO = async () => {
    setError("");
    try {
      const redirectUri = window.location.origin + "/sso-callback";
      const res = await base44.functions.invoke("entraSSO", { action: "authorize_url", redirect_uri: redirectUri });
      if (res.data?.success) {
        sessionStorage.setItem("ssoState", res.data.state);
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || "Microsoft SSO is not configured. Contact your administrator.");
      }
    } catch {
      setError("Unable to start Microsoft sign-in.");
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

      <div className="absolute top-6 left-6 z-10 max-w-sm bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-5 py-4 text-white shadow-lg">
        <p className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold mb-2">Today's Alabama Landmark</p>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
          <div>
            <p className="text-base font-bold leading-tight">{scene.title}</p>
            <p className="text-sm text-white/90 leading-tight">{scene.location}</p>
          </div>
        </div>
        <p className="text-sm text-white/85 leading-snug mt-2.5 pt-2.5 border-t border-white/15">{scene.fact}</p>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6">
          <div className="bg-white rounded-2xl px-6 py-1.5 shadow-lg w-full">
            <Logo className="w-full" />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur p-6 rounded-2xl border border-white/20 shadow-2xl">
          {mfaRequired ? (
            <MfaInput
              emailHint={emailHint}
              onVerify={handleMfaVerify}
              onResend={handleMfaResend}
              onCancel={handleMfaCancel}
              loading={loading}
              error={error}
            />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <Button type="button" onClick={handleMicrosoftSSO} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 23 23"><path fill="#f25022" d="M0 0h10.5v10.5H0z"/><path fill="#7fba00" d="M12.5 0H23v10.5H12.5z"/><path fill="#00a4ef" d="M0 12.5h10.5V23H0z"/><path fill="#ffb900" d="M12.5 12.5H23V23H12.5z"/></svg>
            Sign in with Microsoft
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">or</span></div>
          </div>

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
            <p className="text-xs text-slate-500 mt-1">Format: schoolcode.name</p>
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
          <Button type="submit" variant="outline" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Secure Login
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <FileCheck className="w-3.5 h-3.5 text-rose-700" /> FERPA Aligned
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Encrypted
            </span>
          </div>
          </form>
          )}
        </div>

          <div className="text-center mt-4">
            <Link to="/admin-login" className="text-xs text-slate-300 hover:text-white transition-colors">
              Admin login
            </Link>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">Alabama Schools Reporting Platform</p>
        </div>
    </div>
  );
}