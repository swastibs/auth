import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[color-mix(in_oklch,var(--accent-atomic)_10%,transparent)] text-[var(--accent-atomic)]">
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="font-heading text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
