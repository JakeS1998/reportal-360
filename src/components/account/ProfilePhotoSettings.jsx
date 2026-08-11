import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";

export default function ProfilePhotoSettings({ user, credentials, onSaved }) {
  const [file, setFile] = useState(null); const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); const upload = file ? await base44.integrations.Core.UploadFile({ file }) : {}; const response = await base44.functions.invoke("manageSchoolStaff", { action: "update_self_settings", profile_photo_url: upload.file_url, ...credentials }); if (response.data?.success) onSaved(response.data.user); setSaving(false); };
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Profile picture</h2><p className="mt-1 text-sm text-slate-500">Your name is managed by your school and cannot be changed here.</p><div className="mt-4 flex items-center gap-4">{user?.profile_photo_url && <Image src={user.profile_photo_url} alt="Profile" className="h-14 w-14 rounded-full" />}<Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Button onClick={save} disabled={!file || saving}>{saving ? "Uploading…" : "Save picture"}</Button></div></section>;
}