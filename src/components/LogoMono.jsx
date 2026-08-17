import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/3825bcb64_reportALlogomono.png";

/**
 * Monochrome ReportAL 360 logotype designed for dark backgrounds.
 * Use on navy/dark surfaces (e.g. the dashboard sidebar/header).
 */
export default function LogoMono({ className, src, alt = "ReportAL 360" }) {
  return (
    <Image
      src={src || LOGO_URL}
      alt={alt}
      fittingType="fit"
      originWidth={1024}
      originHeight={368}
      className={className}
    />
  );
}