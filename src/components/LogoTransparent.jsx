import React from "react";
import Logo from "@/components/Logo";

/**
 * Renders the standard ReportAL 360 logo with its white background removed
 * (white -> transparent via an SVG feColorMatrix/feComponentTransfer filter),
 * so the wordmark floats cleanly over dark photographic backgrounds.
 */
export default function LogoTransparent({ className }) {
  return (
    <>
      <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="ral-white-to-alpha">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0"
            />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="1 1 0 0" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div
        className={className}
        style={{
          filter:
            "url(#ral-white-to-alpha) drop-shadow(0 10px 30px rgba(0,0,0,0.45))",
        }}
      >
        <Logo className="w-full" />
      </div>
    </>
  );
}