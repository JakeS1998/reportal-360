import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/48ad450a0_image.png";

/**
 * Renders the ReportAL 360 logo with its solid black background removed
 * (black -> transparent) via an SVG luminance-key filter, so the wordmark
 * floats cleanly over the login page's photographic backdrop.
 */
export default function LogoTransparent({ className }) {
  return (
    <>
      <div className={className} style={{ filter: "brightness(1.45) contrast(1.2) saturate(1.3) drop-shadow(0 6px 18px rgba(0,0,0,0.5))" }}>
        <Image
          src={LOGO_URL}
          alt="ReportAL 360 — Alabama Education, 360° Insight, Better Outcomes"
          fittingType="fit"
          originWidth={1024}
          originHeight={368}
          className="w-full"
        />
      </div>
    </>
  );
}