import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingPlatform from "@/components/landing/LandingPlatform";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingSecurity from "@/components/landing/LandingSecurity";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingCta from "@/components/landing/LandingCta";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="bg-white">
      <LandingNav />
      <LandingHero />
      <LandingPlatform />
      <LandingFeatures />
      <LandingSecurity />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}