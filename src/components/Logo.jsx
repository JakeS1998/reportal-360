import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/7d270db94_798183d9-7eb7-42ab-a60f-51e1d76d78cf.jpg";

export default function Logo({ variant = "horizontal", className, iconClass, textClass }) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGO_URL}
        alt="ReportAL 360"
        className={className}
        fittingType="fill"
        focalPointX={0.5}
        focalPointY={0.12}
      />
    );
  }
  return (
    <div className={`flex items-center gap-2.5 ${className || ""}`}>
      <Image
        src={LOGO_URL}
        alt="ReportAL 360"
        className={`shrink-0 rounded-lg overflow-hidden ${iconClass || "w-16 h-16"}`}
        fittingType="fill"
        focalPointX={0.5}
        focalPointY={0.13}
      />
      <Image
        src={LOGO_URL}
        alt=""
        className={`shrink-0 overflow-hidden ${textClass || "w-44 h-8"}`}
        fittingType="fill"
        focalPointX={0.5}
        focalPointY={0.45}
      />
    </div>
  );
}