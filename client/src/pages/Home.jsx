import { lazy, useEffect } from "react";
import Navbar from "@/components/Navbar";
import CursorGrid from "@/components/CursorGrid/CursorGrid";
import DeferredModule from "@/components/DeferredModule";
import usePerformance from "@/hooks/usePerformance";
import LandingHero from "@/components/LandingPage/LandingHero";
import LandingFooter from "@/components/LandingPage/LandingFooter";
import PricingSection from "@/components/LandingPage/PricingSection";
import { BackgroundDecor } from "@/components/LandingPage/LandingVisuals";
import {
  ComparisonGraphs,
  FAQSection,
  FeatureShowcase,
  HowItWorksSection,
  ProofStrip,
} from "@/components/LandingPage/LandingMarketing";

const HabitTrackerModule = lazy(
  () => import("@/components/HabitTrackerModule/HabitTrackerModule"),
);
const AITaskTrackerModule = lazy(
  () => import("@/components/AITaskTrackerModule/AITaskTrackerModule"),
);

export default function Home() {
  const { animationEnabled } = usePerformance();

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const elem = document.getElementById(id);
      if (elem) {
        setTimeout(() => elem.scrollIntoView({ behavior: "smooth" }), 150);
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <CursorGrid
          cellSize={60}
          color="var(--accent-atomic)"
          gridOpacity={0.15}
        />
      </div>
      <BackgroundDecor animationEnabled={animationEnabled} />
      <Navbar />
      <LandingHero />
      <ProofStrip />
      <FeatureShowcase />

      <div className="flex flex-col">
        <DeferredModule>
          <HabitTrackerModule />
        </DeferredModule>
        <DeferredModule>
          <AITaskTrackerModule />
        </DeferredModule>
      </div>

      <HowItWorksSection />

      <section
        id="before-after"
        className="border-y border-border/70 bg-muted/30 py-10 sm:py-14"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <span className="eyebrow">The transformation</span>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Consistency changes everything
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              A scattered effort feels random. Small actions repeated over time
              become a pattern you can trust.
            </p>
          </div>
          <div className="relative mt-5">
            <div
              className="absolute -inset-6 -z-10 rounded-3xl blur-3xl"
              style={{
                background:
                  "color-mix(in oklch, var(--accent-atomic) 18%, transparent)",
              }}
            />
            <ComparisonGraphs />
          </div>
        </div>
      </section>

      <PricingSection />
      <FAQSection />
      <LandingFooter />
    </div>
  );
}
