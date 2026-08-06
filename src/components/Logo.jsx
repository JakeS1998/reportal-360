import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/7d270db94_798183d9-7eb7-42ab-a60f-51e1d76d78cf.jpg";

export default function Logo({ className, fittingType = "fit", focalPointX, focalPointY }) {
  return (
    <Image
      src={LOGO_URL}
      alt="ReportAL 360"
      className={className}
      fittingType={fittingType}
      focalPointX={focalPointX}
      focalPointY={focalPointY}
    />
  );
}