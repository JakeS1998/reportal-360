import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/5e5021bde_reportALlogomono.png";

/**
 * Full ReportAL 360 logo lockup (icon + wordmark + tagline) on a black
 * background. Best placed on black or very dark surfaces where the black
 * background blends seamlessly.
 */
export default function LogoLanding({ className }) {
  return (
    <Image
      src={LOGO_URL}
      alt="ReportAL 360 — Alabama Education · 360° Insight · Better Outcomes"
      fittingType="fit"
      originWidth={900}
      originHeight={260}
      className={className}
    />
  );
}