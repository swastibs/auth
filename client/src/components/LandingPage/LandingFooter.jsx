import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AtomMark } from "./LandingVisuals";

export default function LandingFooter() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground px-6 py-12 text-center text-background sm:px-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full blur-3xl"
            style={{
              background:
                "color-mix(in oklch, var(--accent-atomic) 35%, transparent)",
            }}
          />
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop planning. Start finishing.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-background/70">
            Set up your first atomic task in under two minutes.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="cta-button">
              Create free account <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-background/30 px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 font-heading font-semibold text-foreground">
            <AtomMark className="size-5" />
            AtomicTask
          </div>
          <p>© {new Date().getFullYear()} AtomicTask. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
