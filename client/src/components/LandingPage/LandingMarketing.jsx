import { ArrowRight, BarChart3, Bot, CalendarDays, ChevronDown, Flame, GitBranch, Target } from "lucide-react";

const steps = [
  ["Capture it", "Add a task the moment it crosses your mind.", Target],
  ["Break it down", "Split big goals into actions you can finish today.", GitBranch],
  ["Track the streak", "Complete one atom at a time and see the pattern build.", Flame],
];

const features = [
  [Bot, "AI planning", "Turn a thought into a focused queue of doable next actions."],
  [Flame, "Habit rhythm", "Check in daily, watch streaks grow, and learn what works."],
  [BarChart3, "Useful insight", "Measure momentum without turning your life into a spreadsheet."],
  [CalendarDays, "Daily focus", "Keep dates, priorities, and the next move close at hand."],
];

const faqs = [
  ["Do I need a calendar or complex setup?", "No. Start with one task or habit. Dates, planning prompts, and integrations are there when they make the next step easier."],
  ["Is AtomicTask only for work?", "No. Use it for projects, errands, exercise, reading, reflection, and the small routines that keep the day moving."],
  ["Can I try it before paying?", "Yes. The free plan gives you the core task and habit workflow before you decide whether more planning power is worth it."],
  ["Will my data be private?", "Your tasks and habits belong to you. The product is built around authenticated accounts and least-access behavior."],
];

export function ProofStrip() {
  const items = [["01", "One system", "Tasks, habits, and focus"], ["02", "Small actions", "Big goals, broken down"], ["03", "Visible momentum", "Progress at a glance"], ["04", "Free to start", "No credit card required"]];
  return <section className="border-y border-border/70 bg-muted/20"><div className="mx-auto grid max-w-6xl divide-y divide-border/70 px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4">{items.map(([number, title, description]) => <div key={number} className="flex gap-3 px-1 py-4 sm:px-5"><span className="font-heading text-xs font-semibold text-muted-foreground/60">{number}</span><div><strong className="text-sm font-semibold">{title}</strong><p className="mt-1 text-xs text-muted-foreground">{description}</p></div></div>)}</div></section>;
}

export function FeatureShowcase() {
  return <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18"><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><span className="eyebrow">One clear system</span><h2 className="mt-3 max-w-xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Less managing the system. More living the day.</h2></div><p className="max-w-xl text-sm leading-6 text-muted-foreground lg:justify-self-end">AtomicTask combines the parts of a productive day that are usually scattered across separate apps.</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2">{features.map(([Icon, eyebrow, title]) => <article key={title} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"><div className="flex items-start justify-between"><span className="inline-flex size-9 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklch, var(--accent-atomic) 14%, transparent)", color: "var(--accent-atomic)" }}><Icon className="size-4" /></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><span className="mt-5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</span><h3 className="mt-2 font-heading text-lg font-semibold">{title}</h3></article>)}</div></section>;
}

export function HowItWorksSection() {
  return <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-18"><div className="mx-auto max-w-2xl text-center"><span className="eyebrow">The loop</span><h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Three small steps, repeated daily</h2><p className="mt-2 text-sm text-muted-foreground">No project plans to configure. Just the next atomic action.</p></div><ol className="mt-9 grid gap-4 sm:grid-cols-3">{steps.map(([title, description, Icon], index) => <li key={title} className="rounded-2xl border border-border bg-card p-5"><span className="font-heading text-sm font-semibold text-muted-foreground/70 mr-2">0{index + 1}</span><div className="mt-3 inline-flex size-9 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklch, var(--accent-atomic) 16%, transparent)", color: "var(--accent-atomic)" }}><Icon className="size-4" /></div><h3 className="mt-3 font-heading text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></li>)}</ol></section>;
}

export { default as PricingSection } from "./PricingSection";
  /*
  return <section id="pricing" className="scroll-mt-24 border-y border-border/70 bg-muted/20 py-14 sm:py-18"><div className="mx-auto max-w-6xl px-4 sm:px-6"><div className="mx-auto max-w-2xl text-center"><span className="eyebrow">Simple pricing</span><h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Upgrade when it earns its place.</h2><p className="mt-2 text-sm text-muted-foreground">Clear limits, useful upgrades, no confusing feature maze.</p></div><div className="mt-8 grid gap-3 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative flex flex-col rounded-2xl border bg-card p-5 ${plan.featured ? "border-[var(--accent-atomic)] shadow-lg" : "border-border"}`}>{plan.featured && <span className="absolute -top-3 left-5 rounded-full bg-[var(--accent-atomic)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-atomic-foreground)]">Most popular</span>}<div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-xl font-semibold">{plan.name}</h3><p className="mt-1 text-sm text-muted-foreground">{plan.description}</p></div><div className="text-right"><strong className="font-heading text-2xl">{plan.price}</strong><span className="block text-[10px] text-muted-foreground">/ month</span></div></div><ul className="mt-5 grid gap-2 border-t border-border/70 pt-4 text-sm">{plan.highlights.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckCheck className="mt-0.5 size-4 shrink-0 text-[var(--accent-atomic)]" /><span>{feature}</span></li>)}</ul><Link to="/signup" className={`mt-6 ${plan.featured ? "cta-button" : "cta-outline"}`}>{plan.action}<ArrowRight className="size-4" /></Link></article>)}</div><div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><caption className="sr-only">Feature comparison for Free, Pro, and Team plans</caption><thead><tr className="border-b border-border bg-muted/30"><th scope="col" className="px-4 py-3 font-semibold">Features</th>{plans.map((plan) => <th scope="col" key={plan.name} className="px-4 py-3 font-heading font-semibold">{plan.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{plan.price}</span></th>)}</tr></thead><tbody>{featureMatrix.map(([name, free, pro, team]) => <tr key={name} className="border-b border-border/70 last:border-0"><th scope="row" className="px-4 py-3 font-medium">{name}</th>{[free, pro, team].map((value, index) => <td key={`${name}-${index}`} className="px-4 py-3"><Status value={value} /></td>)}</tr>)}</tbody></table></div></div></section>;
}

*/
export function FAQSection() {
  return <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-18"><div className="text-center"><span className="eyebrow">Questions, answered</span><h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">A calmer way to get started.</h2></div><div className="mt-8 divide-y divide-border border-y border-border">{faqs.map(([question, answer]) => <details key={question} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-sm font-semibold sm:text-base">{question}<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-2 max-w-2xl pr-8 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div></section>;
}

const graphData = [
  { title: "Before", subtitle: "Inconsistent rhythm", average: "31%", detail: "Scattered effort this week", values: [22, 48, 18, 36, 12, 42, 26], tone: "muted" },
  { title: "After", subtitle: "Mostly consistent", average: "82%", detail: "Small actions, mostly consistent", values: [48, 54, 57, 63, 61, 70, 73], tone: "accent" },
];

export function ComparisonGraphs() {
  const width = 520;
  const height = 150;
  const padding = 18;
  const point = (value, index, values) => ({ x: padding + (index / (values.length - 1)) * (width - padding * 2), y: height - padding - (value / 100) * (height - padding * 2) });
  return <div className="grid gap-4 md:grid-cols-2">{graphData.map((graph) => { const color = graph.tone === "accent" ? "var(--accent-atomic)" : "var(--muted-foreground)"; const points = graph.values.map((value, index) => { const p = point(value, index, graph.values); return `${p.x},${p.y}`; }).join(" "); const dots = Array.from({ length: 28 }, (_, index) => graph.tone === "muted" ? ((index * 5) % 9 < 4 ? 1 : 0) : (index % 11 === 0 ? 1 : 3)); return <article key={graph.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between border-b border-border/70 pb-2"><div><span className="eyebrow">{graph.title}</span><h3 className="mt-1 font-heading text-lg font-semibold">{graph.subtitle}</h3></div><strong className="font-heading text-2xl" style={{ color }}>{graph.average}</strong></div><svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full" role="img" aria-label={`${graph.title} consistency graph`}><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{graph.values.map((value, index) => { const p = point(value, index, graph.values); return <circle key={index} cx={p.x} cy={p.y} r="3" fill={color} />; })}</svg><div className="mt-2 rounded-lg border border-border/70 bg-muted/20 p-2"><div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Daily activity</span><span>Less&nbsp;&nbsp; More</span></div><div className="grid grid-cols-[repeat(7,minmax(0,1fr))] justify-items-start gap-1.5" role="img" aria-label={`${graph.title} daily activity graph`}>{dots.map((level, index) => <span key={index} className="size-1.5 rounded-[2px] sm:size-2" title={`${level ? level : "No"} activity`} style={{ background: color, opacity: level ? 0.8 : 0.12 }} />)}</div></div><div className="mt-2 flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Mon</span><span>{graph.detail}</span><span>Sun</span></div></article>; })}</div>;
}
