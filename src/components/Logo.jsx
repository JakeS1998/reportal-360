import React from "react";

const BASE =
  "https://media.base44.com/images/public/6a71ff59da728c2aa6a0d50b/7d270db94_798183d9-7eb7-42ab-a60f-51e1d76d78cf";
const FILENAME = "7d270db94_798183d9-7eb7-42ab-a60f-51e1d76d78cf";

// Server-side crop: source image is 934×723
function cropUrl(w, h, x, y) {
  return `${BASE}/v1/crop/w_${w},h_${h},x_${x},y_${y},q_90/${FILENAME}.webp`;
}

const ICON_URL = cropUrl(420, 330, 260, 25);
const WORDMARK_URL = cropUrl(600, 100, 170, 370);

export default function Logo({ variant = "horizontal", className, iconClass = "h-14 w-auto", textClass = "h-7 w-auto" }) {
  if (variant === "icon") {
    return <img src={ICON_URL} alt="ReportAL 360" className={className} />;
  }
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <img src={ICON_URL} alt="ReportAL 360" className={`shrink-0 ${iconClass}`} />
      <img src={WORDMARK_URL} alt="" className={`shrink-0 ${textClass}`} />
    </div>
  );
}