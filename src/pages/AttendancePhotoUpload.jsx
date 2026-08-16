import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, CircleCheck } from "lucide-react";
import NativeDeviceFileButton from "@/components/mobile/NativeDeviceFileButton";

export default function AttendancePhotoUpload() {
  const token = new URLSearchParams(window.location.search).get("token");
  const [status, setStatus] = useState("loading");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (token) base44.functions.invoke("manageAttendancePhotos", { action: "get", token }).then((response) => setStatus(response.data?.success ? response.data.status : "expired")); else setStatus("expired"); }, [token]);
  const upload = async () => {
    if (!file) return;
    setUploading(true);
    const uploaded = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke("manageAttendancePhotos", { action: "upload", token, file_url: uploaded.file_url, file_name: file.name });
    setStatus(response.data?.success ? "uploaded" : "expired");
    setUploading(false);
  };
  if (status === "loading") return <main className="p-8 text-center text-sm text-slate-500">Preparing camera upload…</main>;
  if (status === "uploaded") return <main className="p-8 text-center"><CircleCheck className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h1 className="font-bold text-slate-900">Upload successful</h1><p className="mt-1 text-sm text-slate-500">Your photo is attached and ready to view on the attendance register.</p></main>;
  if (status === "expired") return <main className="p-8 text-center text-sm text-rose-600">This photo link has expired. Please create a new QR code from the attendance register.</main>;
  return <main className="mx-auto max-w-md p-6"><Camera className="mb-3 h-8 w-8 text-slate-700" /><h1 className="text-lg font-bold text-slate-900">Add absence evidence</h1><p className="mt-1 text-sm text-slate-500">Take a photo or choose a document from this phone.</p><NativeDeviceFileButton label="Take Photo / Choose File" onFile={setFile} className="mt-5 w-full" /><input type="file" accept="image/*,.pdf" capture="environment" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-3 w-full text-sm" /><Button className="mt-4 w-full" disabled={!file || uploading} onClick={upload}>{uploading ? "Uploading…" : "Attach to attendance"}</Button></main>;
}