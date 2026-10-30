import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { OrbitDiagram } from "./LandingVisuals";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--accent-atomic) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div className="animate-hero-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="size-1.5 rounded-full"
              style={{ background: "var(--accent-atomic)" }}
            />
            Task & habit system
          </span>
          <h1 className="mt-5 max-w-2xl font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Break the big thing into{" "}
            <span style={{ color: "var(--accent-atomic)" }}>next</span> thing.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            AtomicTask turns overwhelming goals into small, trackable actions so
            you always know what to do next.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="cta-button">
              Start free <ArrowRight className="size-4" />
            </Link>
            <Link to="/login" className="cta-outline">
              Log in
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free tier available. No credit card required.
          </p>
        </div>
        <OrbitDiagram />
      </div>
    </section>
  );
}
