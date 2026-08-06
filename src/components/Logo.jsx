import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/d8c290883_image.png";

export default function Logo({ variant = "horizontal", className }) {
  if (variant === "icon") {
    return (
      <Image
        src={LOGO_URL}
        alt="ReportAL 360"
        className={className}
        fittingType="fill"
        focalPointX={0.12}
        focalPointY={0.5}
        originWidth={824}
        originHeight={269}
      />
    );
  }
  return (
    <Image
      src={LOGO_URL}
      alt="ReportAL 360"
      className={className}
      fittingType="fit"
      originWidth={824}
      originHeight={269}
    />
  );
}