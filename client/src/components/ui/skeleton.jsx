import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[color-mix(in_oklch,var(--muted)_70%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
