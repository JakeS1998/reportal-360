import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingPlatform from "@/components/landing/LandingPlatform";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingSecurity from "@/components/landing/LandingSecurity";
import LandingContactSales from "@/components/landing/LandingContactSales";
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
      <LandingContactSales />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}