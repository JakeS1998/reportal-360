import React, { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAppbuildWrapper } from "@/hooks/useAppbuildWrapper";
import { isIgnoredAppbuildError, pickAppbuildFile } from "@/lib/appbuildNativeFile";

export default function NativeDeviceFileButton({ label = "Attach from Device", onFile, className }) {
  const { isWrapper, capabilities, wrapper } = useAppbuildWrapper();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const available = isWrapper && (capabilities.includes("camera") || capabilities.includes("CapgoFilePicker"));
  if (!available) return null;
  const choose = async () => {
    setLoading(true);
    try { onFile(await pickAppbuildFile(wrapper, capabilities, "mobile-upload")); }
    catch (error) { if (!isIgnoredAppbuildError(error)) toast({ title: "Could not attach file", description: error.message || "Please try again.", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  return <Button type="button" variant="outline" onClick={choose} disabled={loading} className={className}><Camera className="mr-2 h-4 w-4" />{loading ? "Opening device…" : label}</Button>;
}