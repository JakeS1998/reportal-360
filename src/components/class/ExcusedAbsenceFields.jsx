import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Paperclip } from "lucide-react";

export default function ExcusedAbsenceFields({ detail, disabled, onChange, attendanceContext }) {
  const [token, setToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const isLaptop = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  const photoUrl = token ? `${window.location.origin}/attendance-photo?token=${token}` : "";

  useEffect(() => {
    if (!token || photoUploaded) return;
    const poll = async () => {
      const response = await base44.functions.invoke("manageAttendancePhotos", { action: "get", token });
      if (response.data?.status === "uploaded") {
        onChange({ ...detail, fileUrl: response.data.file_url, fileName: response.data.file_name });
        setPhotoUploaded(true);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [token, photoUploaded]);

  const takePhoto = async () => {
    setCreating(true);
    setPhotoError("");
    try {
      const user = attendanceContext.user;
      const response = await base44.functions.invoke("manageAttendancePhotos", {
        action: "create", ...attendanceContext, excused_reason: detail?.reason || "", school_code: user?.school_code,
        caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email),
      });
      if (!response.data?.success) throw new Error(response.data?.error || "Could not create a photo link.");
      setPhotoUploaded(false);
      setToken(response.data.token);
    } catch (error) {
      setPhotoError(error.response?.data?.error || error.message || "Could not create a photo link.");
    } finally {
      setCreating(false);
    }
  };

  return <div className="mt-2 flex flex-wrap items-center gap-2"><select value={detail?.reason || ""} disabled={disabled} onChange={(event) => onChange({ ...detail, reason: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"><option value="">Select evidence type…</option><option>Parent Note</option><option>Medical Note</option><option>Professional Note</option></select><label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"><Paperclip className="h-3.5 w-3.5" />{detail?.file?.name || detail?.fileName || "Attach note"}<input type="file" accept="image/*,.pdf" capture="environment" disabled={disabled} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onChange({ ...detail, file, fileName: file.name }); }} /></label>{isLaptop && !disabled && <button type="button" disabled={creating} onClick={takePhoto} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Camera className="h-3.5 w-3.5" />{creating ? "Creating…" : "Take photo"}</button>}{photoError && <p className="w-full text-xs text-rose-600">{photoError}</p>}{detail?.fileUrl && <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><Paperclip className="h-3.5 w-3.5" />View uploaded photo</a>}{photoUrl && <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(photoUrl)}`} alt="Scan to take an attendance photo" className="h-20 w-20" /><span className="text-xs text-slate-500">Scan with your phone to add the photo.</span></div>}</div>;
}