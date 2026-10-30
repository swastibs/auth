import { ArrowRight, Check, CheckCheck, X } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "₹0",
    description: "Try the core AtomicTask loop.",
    highlights: ["5 tasks per day", "5 habits", "Limited AI tools and tokens"],
    action: "Start free",
  },
  {
    name: "Pro",
    price: "₹299",
    description: "More room for a serious personal system.",
    highlights: [
      "50 tasks per day",
      "10 habits",
      "Higher AI limits and collaboration",
    ],
    action: "Choose Pro",
    featured: true,
  },
  {
    name: "Expert",
    price: "699",
    description: "Everything unlocked for focused teams.",
    highlights: [
      "Unlimited tasks and habits",
      "Unlimited AI tokens",
      "Full collaboration and integrations",
    ],
    action: "Unlock everything",
  },
];

const features = [
  ["Tasks", [true, "5 per day"], [true, "50 per day"], [true, "Unlimited"]],
  ["Habits", [true, "Up to 5"], [true, "Up to 10"], [true, "Unlimited"]],
  [
    "AI assistant",
    [true, "Limited tools"],
    [true, "Expanded tools"],
    [true, "All tools"],
  ],
  [
    "AI tokens",
    [true, "100 per day"],
    [true, "1,000 per day"],
    [true, "Unlimited"],
  ],
  [
    "Daily streaks and progress",
    [true, "Included"],
    [true, "Included"],
    [true, "Included"],
  ],
  [
    "Advanced analytics",
    [false, "Not included"],
    [true, "Included"],
    [true, "Included"],
  ],
  [
    "Invite collaborators",
    [false, "Not included"],
    [true, "Included"],
    [true, "Unlimited"],
  ],
  [
    "Shared projects",
    [false, "Not included"],
    [false, "Included"],
    [true, "Included"],
  ],
  [
    "Calendar integrations",
    [false, "Not included"],
    [false, "Included"],
    [true, "Included"],
  ],
  [
    "Export and API access",
    [false, "Not included"],
    [false, "Not included"],
    [true, "Included"],
  ],
];

function FeatureStatus({ value }) {
  const [available, label] = value;
  return (
    <span className="inline-flex items-center gap-2">
      {available ? (
        <Check
          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-label="Available"
        />
      ) : (
        <X
          className="size-4 shrink-0 text-muted-foreground/60"
          aria-label="Unavailable"
        />
      )}
      <span className={available ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </span>
  );
}

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-y border-border/70 bg-muted/20 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Simple pricing</span>
          <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free. Upgrade when it earns its place.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear limits, useful upgrades, no confusing feature maze.
          </p>
        </header>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {plans.map((plan, planIndex) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-4 ${plan.featured ? "border-[var(--accent-atomic)] shadow-lg" : "border-border"}`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-4 rounded-full bg-[var(--accent-atomic)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-atomic-foreground)]">
                  Most popular
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <strong className="font-heading text-xl">{plan.price}</strong>
                  <span className="block text-[10px] text-muted-foreground">
                    / month
                  </span>
                </div>
              </div>
              <ul className="mt-4 grid gap-1.5 border-t border-border/70 pt-3 text-xs">
                {plan.highlights.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--accent-atomic)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-2 border-t border-border/70 pt-3 text-[11px]">
                {features.map(([name, free, pro, team]) => (
                  <div
                    key={name}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="font-medium text-muted-foreground">
                      {name}
                    </span>
                    <FeatureStatus value={[free, pro, team][planIndex]} />
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className={`mt-5 ${plan.featured ? "cta-button" : "cta-outline"}`}
              >
                {plan.action}
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
