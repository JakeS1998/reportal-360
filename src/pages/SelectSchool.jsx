import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, KeyRound, MapPin, ShieldCheck, Lock, FileCheck } from "lucide-react";
import MfaInput from "@/components/MfaInput";
import DormantUnlockInput from "@/components/DormantUnlockInput";
import { completeLogin, setTempSession } from "@/lib/authFlow";
import Logo from "@/components/Logo";
import GoogleIcon from "@/components/GoogleIcon";
import LoginVisualPanel from "@/components/login/LoginVisualPanel";
import { registerAppbuildPush } from "@/hooks/useAppbuildWrapper";
import { Image } from "@/components/ui/image";

const SCENES = [
  { time: "morning", url: "https://images.unsplash.com/photo-1440582096070-fa5961d9d682?auto=format&fit=crop&w=1920&q=80", title: "Birmingham Skyline", location: "Birmingham, Alabama", fact: "Founded in 1871, Birmingham grew so fast it earned the nickname 'The Magic City.'" },
  { time: "morning", url: "https://images.unsplash.com/photo-1627063652902-a94b7d8df450?auto=format&fit=crop&w=1920&q=80", title: "Appalachian Foothills", location: "North Alabama", fact: "North Alabama marks the southern tip of the Appalachians — the oldest mountain range in North America." },
  { time: "morning", url: "https://images.unsplash.com/photo-1589747948711-64c21bee4019?auto=format&fit=crop&w=1920&q=80", title: "Lake Martin", location: "Central Alabama", fact: "With over 750 miles of shoreline, Lake Martin is one of the largest man-made lakes in the US." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090288-1ccf17fc57a4?auto=format&fit=crop&w=1920&q=80", title: "Alabama Theatre", location: "Birmingham, Alabama", fact: "Opened in 1927 and dubbed the 'Showplace of the South,' it still hosts films and concerts." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090328-1892e90ae260?auto=format&fit=crop&w=1920&q=80", title: "Archives & History Museum", location: "Montgomery, Alabama", fact: "Founded in 1901, it's the oldest state-funded archives agency in the United States." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1574723507385-265b5635e6c4?auto=format&fit=crop&w=1920&q=80", title: "Gulf Shores Harbor", location: "Gulf Shores, Alabama", fact: "Gulf Shores hosts the National Shrimp Festival each October, drawing over 200,000 visitors." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1659354264754-564df7e375da?auto=format&fit=crop&w=1920&q=80", title: "Coastal Boardwalk", location: "Gulf Shores, Alabama", fact: "Gulf State Park features over 28 miles of paved trails winding through nine distinct ecosystems." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1551292788-2031aee091a6?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Waves", location: "Gulf Shores, Alabama", fact: "The warm Gulf waters make Alabama's coast a year-round destination for fishing and water sports." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1670872623631-cd88b0803d58?auto=format&fit=crop&w=1920&q=80", title: "Big Spring Park", location: "Huntsville, Alabama", fact: "Built around a natural spring that has flowed for over 10,000 years — the reason Huntsville was founded." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1711048090525-807f98902860?auto=format&fit=crop&w=1920&q=80", title: "Rocket Park", location: "Huntsville, Alabama", fact: "Established in 1960 at Redstone Arsenal, it displays rockets from the early days of the US space program." },
  { time: "afternoon", url: "https://images.unsplash.com/photo-1600388704262-530cb4af35d3?auto=format&fit=crop&w=1920&q=80", title: "Historic Huntsville", location: "Huntsville, Alabama", fact: "Huntsville was the first permanent settlement in Alabama, founded in 1805 and originally named Twickenham." },
  { time: "evening", url: "https://images.unsplash.com/photo-1728001528593-58c93982917b?auto=format&fit=crop&w=1920&q=80", title: "Downtown Montgomery", location: "Montgomery, Alabama", fact: "Montgomery has been Alabama's capital since 1846 and hosted the historic 1955 bus boycott." },
  { time: "evening", url: "https://images.unsplash.com/photo-1644578843995-b2cc1acbdf33?auto=format&fit=crop&w=1920&q=80", title: "Gulf Coast Sunset", location: "Gulf Shores, Alabama", fact: "Alabama's Gulf Coast boasts 32 miles of sugar-white sand beaches along the Gulf of Mexico." },
  { time: "evening", url: "https://images.unsplash.com/photo-1622409408503-f3ff61cc631b?auto=format&fit=crop&w=1920&q=80", title: "Huntsville Skyline", location: "Huntsville, Alabama", fact: "Huntsville is nicknamed 'The Rocket City' for its pivotal role in developing the Saturn V moon rocket." },
  { time: "evening", url: "https://images.unsplash.com/photo-1605813640975-0ef0ad36826a?auto=format&fit=crop&w=1920&q=80", title: "Saturn V Rocket", location: "Huntsville, Alabama", fact: "The Saturn V at the Space & Rocket Center is one of only three remaining and stands 363 feet tall." },
  { time: "morning", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/a05c80435_generated_image.png", title: "Cheaha State Park", location: "Clay County, Alabama", fact: "Cheaha Mountain is Alabama's highest point, rising 2,407 feet above sea level." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/61a1762cd_generated_image.png", title: "Little River Canyon", location: "Northeast Alabama", fact: "Little River is one of the few rivers in the country that flows for most of its length atop a mountain." },
  { time: "evening", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/d53c05b7b_generated_image.png", title: "Mobile Bay", location: "Mobile, Alabama", fact: "Mobile Bay has played a central role in Alabama's maritime history for more than 300 years." },
  { time: "morning", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/051ff80bf_generated_image.png", title: "Tuscaloosa Hills", location: "Tuscaloosa County, Alabama", fact: "The rolling hills around Tuscaloosa form part of Alabama's diverse Piedmont landscape." },
  { time: "morning", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/64c534d21_generated_image.png", title: "Chewacla State Park", location: "Auburn, Alabama", fact: "Chewacla State Park protects 696 acres of forests, streams, and lakes near Auburn." },
  { time: "morning", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/3bfd82019_generated_image.png", title: "Edmund Pettus Bridge", location: "Selma, Alabama", fact: "The Edmund Pettus Bridge spans the Alabama River in historic Selma." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/bdfb40c70_generated_image.png", title: "Bankhead National Forest", location: "Northwest Alabama", fact: "Bankhead National Forest is home to the Sipsey Wilderness, Alabama's largest wilderness area." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/47f498ef4_generated_image.png", title: "Dauphin Island", location: "Mobile County, Alabama", fact: "Dauphin Island is a barrier island known for bird migration and Gulf Coast beaches." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/592debd4c_generated_image.png", title: "Cathedral Caverns", location: "Marshall County, Alabama", fact: "Cathedral Caverns is known for its massive entrance and striking limestone formations." },
  { time: "evening", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/1ad80f88a_generated_image.png", title: "DeSoto State Park", location: "Northeast Alabama", fact: "DeSoto State Park sits atop Lookout Mountain near some of Alabama's most scenic waterfalls." },
  { time: "evening", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/5ecb796ce_generated_image.png", title: "Black Belt Countryside", location: "Central Alabama", fact: "Alabama's Black Belt is known for its fertile dark soils and rich cultural history." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/5a89930bf_generated_image.png", title: "USS Alabama", location: "Mobile, Alabama", fact: "The USS Alabama is a World War II battleship preserved at Battleship Memorial Park on Mobile Bay." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/d3fc6f772_generated_image.png", title: "Vulcan Park", location: "Birmingham, Alabama", fact: "Vulcan, the world's largest cast-iron statue, overlooks Birmingham from Red Mountain." },
  { time: "evening", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/b2007d41b_generated_image.png", title: "DeSoto Falls", location: "Fort Payne, Alabama", fact: "DeSoto Falls cascades over 100 feet into a dramatic Little River Canyon gorge near Fort Payne." },
  { time: "morning", url: "https://images.unsplash.com/photo-1675737220508-6ddad0f837fd?auto=format&fit=crop&w=1920&q=80", title: "Auburn University", location: "Auburn, Alabama", fact: "Founded in 1856, Auburn University is one of Alabama's largest public universities." },
  { time: "morning", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/79e0d87a1_generated_image.png", title: "University of Alabama", location: "Tuscaloosa, Alabama", fact: "The University of Alabama was founded in 1831 and is Alabama's oldest public university." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/22b5f45c2_generated_image.png", title: "UAB", location: "Birmingham, Alabama", fact: "UAB brings education, research, and health care together in the heart of Birmingham." },
  { time: "afternoon", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/a93da0fec_generated_image.png", title: "UAH", location: "Huntsville, Alabama", fact: "UAH is a leading research university in Alabama's Rocket City." },
  { time: "evening", url: "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/90bf764f3_generated_image.png", title: "Jacksonville State University", location: "Jacksonville, Alabama", fact: "Jacksonville State University has served northeast Alabama students since 1883." },
];

function timeOfDay(h) {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

function pickScene() {
  const tod = timeOfDay(new Date().getHours());
  const pool = SCENES.filter((s) => s.time === tod);
  const arr = pool.length ? pool : SCENES;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGreeting() {
  const tod = timeOfDay(new Date().getHours());
  if (tod === "morning") return { greeting: "Good Morning", greetingSub: "Ready to explore Alabama school performance?", periodLabel: "Morning" };
  if (tod === "afternoon") return { greeting: "Good Afternoon", greetingSub: "Welcome back.", periodLabel: "Afternoon" };
  return { greeting: "Good Evening", greetingSub: "Ready to explore Alabama school performance?", periodLabel: "Evening" };
}

export default function SelectSchool() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [dormantUnlockRequired, setDormantUnlockRequired] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);
  const navigate = useNavigate();
  const { greeting, greetingSub, periodLabel } = getGreeting();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const tzStr = (Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(now).find((p) => p.type === "timeZoneName") || {}).value || "";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const daylightProgress = Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - 6) / 12));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (res.data?.mfa_required) {
        setMfaRequired(true);
        setEmailHint(res.data.email_hint || "your email");
        setEmailFailed(!!res.data.email_failed);
        return;
      }
      if (res.data?.dormant_unlock_required) {
        setDormantUnlockRequired(true);
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
      await registerAppbuildPush();
      window.location.assign(user.role === "student" ? "/my-student" : "/overview");
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
      await registerAppbuildPush();
      window.location.assign(user.role === "student" ? "/my-student" : "/overview");
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
        setEmailFailed(!!res.data.email_failed);
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
    setEmailFailed(false);
  };

  const handleDormantUnlock = async (otp, newPassword) => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password, dormant_otp: otp, new_password: newPassword });
      if (res.data?.dormant_unlock_required) {
        setError("Invalid or expired code. Please try again.");
        return;
      }
      if (!res.data?.success) {
        setError(res.data?.error || "Reactivation failed");
        return;
      }
      const user = res.data.user;
      await completeLogin(user);
      await registerAppbuildPush();
      window.location.assign(user.role === "student" ? "/my-student" : "/overview");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to reactivate");
    } finally {
      setLoading(false);
    }
  };

  const handleDormantResend = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("loginUser", { username, password });
      if (res.data?.dormant_unlock_required) {
        setEmailHint(res.data.email_hint || "your email");
      }
    } catch {
      setError("Unable to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handleDormantCancel = () => {
    setDormantUnlockRequired(false);
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
        sessionStorage.setItem("ssoProvider", "microsoft");
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || "Microsoft SSO is not configured. Contact your administrator.");
      }
    } catch {
      setError("Unable to start Microsoft sign-in.");
    }
  };

  const handleGoogleSSO = async () => {
    setError("");
    try {
      const redirectUri = window.location.origin + "/sso-callback";
      const res = await base44.functions.invoke("googleSSO", { action: "authorize_url", redirect_uri: redirectUri });
      if (res.data?.success) {
        sessionStorage.setItem("ssoState", res.data.state);
        sessionStorage.setItem("ssoProvider", "google");
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || "Google SSO is not configured. Contact your administrator.");
      }
    } catch {
      setError("Unable to start Google sign-in.");
    }
  };

  return <div className="min-h-screen bg-slate-100 px-4 py-6 lg:flex lg:items-center lg:justify-center lg:p-10"><main className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.08fr_1fr]"><LoginVisualPanel scenes={SCENES} /><section className="flex min-h-[640px] items-center justify-center p-7 sm:p-12"><div className="w-full max-w-md"><Logo className="h-auto w-60" /><div className="mt-10 mb-7"><div className="mb-4 h-1 w-10 rounded-full bg-blue-600" /><h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Sign in to access your school’s ReportAL 360 workspace.</p></div>{mfaRequired ? <MfaInput emailHint={emailHint} deliveryWarning={emailFailed} onVerify={handleMfaVerify} onResend={handleMfaResend} onCancel={handleMfaCancel} loading={loading} error={error} /> : dormantUnlockRequired ? <DormantUnlockInput emailHint={emailHint} onVerify={handleDormantUnlock} onResend={handleDormantResend} onCancel={handleDormantCancel} loading={loading} error={error} /> : <form onSubmit={handleSubmit} className="space-y-4"><Button type="button" variant="outline" onClick={handleMicrosoftSSO} disabled={loading} className="h-11 w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><svg className="mr-2 h-5 w-5" viewBox="0 0 23 23"><path fill="#f25022" d="M0 0h10.5v10.5H0z"/><path fill="#7fba00" d="M12.5 0H23v10.5H12.5z"/><path fill="#00a4ef" d="M0 12.5h10.5V23H0z"/><path fill="#ffb900" d="M12.5 12.5H23V23H12.5z"/></svg>Continue with Microsoft</Button><Button type="button" variant="outline" onClick={handleGoogleSSO} disabled={loading} className="h-11 w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50"><GoogleIcon className="mr-2 h-5 w-5" />Continue with Google</Button><div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or continue with username</span></div></div><div><Label className="text-sm font-medium text-slate-700">Username</Label><div className="relative mt-1"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" className="h-11 pl-9" autoCapitalize="none" autoCorrect="off" /></div><p className="mt-1 text-xs text-slate-500">Staff: schoolcode.name · Students: permanent student number</p></div><div><Label className="text-sm font-medium text-slate-700">Password</Label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11 pl-9" /></div></div>{error && <p className="text-sm text-rose-600">{error}</p>}<Button type="submit" disabled={loading} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800">{loading ? "Signing in..." : "Sign in"}{!loading && <ArrowRight className="ml-2 h-4 w-4" />}</Button></form>}<div className="mt-8 border-t border-slate-100 pt-5 text-center"><p className="text-xs text-slate-500">Secure login · FERPA aligned · Encrypted</p><Link to="/admin-login" className="mt-2 inline-block text-xs font-medium text-slate-600 hover:text-slate-900">Admin login</Link></div></div></section></main></div>;
}