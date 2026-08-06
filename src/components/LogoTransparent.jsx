import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/44363e2b2_image.png";

/**
 * Renders the ReportAL 360 logo with its solid black background removed
 * (black -> transparent) via an SVG luminance-key filter, so the wordmark
 * floats cleanly over the login page's photographic backdrop.
 */
export default function LogoTransparent({ className }) {
  return (
    <>
      <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="ral-black-to-alpha">
            {/* Put perceptual luminance into the alpha channel. */}
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0"
            />
            {/* Pure black (lum 0) -> transparent; any content (lum >= ~0.12) -> opaque. */}
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 1 1 1 1 1 1 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div
        className={className}
        style={{
          filter:
            "url(#ral-black-to-alpha) drop-shadow(0 10px 30px rgba(0,0,0,0.45))",
        }}
      >
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