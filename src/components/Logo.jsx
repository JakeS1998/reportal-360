import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/5ead22640_generated_image.png";

export default function Logo({ variant = "horizontal", className }) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGO_URL}
        alt="ReportAL 360"
        className={className}
        fittingType="fill"
        focalPointX={0.15}
        focalPointY={0.5}
        originWidth={1024}
        originHeight={1024}
      />
    );
  }
  return (
    <Image
      src={LOGO_URL}
      alt="ReportAL 360"
      className={className}
      fittingType="fill"
      focalPointX={0.5}
      focalPointY={0.5}
      originWidth={1024}
      originHeight={1024}
    />
  );
}