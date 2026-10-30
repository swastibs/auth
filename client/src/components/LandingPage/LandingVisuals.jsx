import { BarChart3, CheckCheck, Flame, GitBranch } from "lucide-react";

const shapes = [
  [10, 15, 24, 45],
  [85, 5, 18, 120],
  [45, 70, 30, 200],
  [70, 40, 12, 80],
  [20, 80, 36, 310],
  [90, 75, 28, 270],
  [35, 90, 22, 40],
  [50, 45, 28, 25],
];

export function BackgroundDecor({ animationEnabled }) {
  if (!animationEnabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map(([x, y, size, rotation], index) => (
        <span
          key={`${x}-${y}`}
          className="absolute rounded-full opacity-10 blur-[2px]"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            left: `${x}%`,
            top: `${y}%`,
            background: "var(--muted-foreground)",
            transform: `rotate(${rotation}deg)`,
            animation: `landing-float-${index % 4} ${6 + index}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes landing-float-0 { to { transform: translate(20px, -24px); } }
        @keyframes landing-float-1 { to { transform: translate(-24px, 16px); } }
        @keyframes landing-float-2 { to { transform: translate(28px, 18px); } }
        @keyframes landing-float-3 { to { transform: translate(-14px, -28px); } }
      `}</style>
    </div>
  );
}

function OrbitRing({ size, duration, reverse, icon: Icon }) {
  return (
    <div
      className="absolute inset-0 m-auto rounded-full border border-border/60"
      style={{
        width: size,
        height: size,
        animation: `orbit-spin ${duration} linear infinite ${reverse ? "reverse" : "normal"}`,
      }}
    >
      <div
        className="absolute left-1/2 top-0 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm"
        style={{
          animation: `orbit-counter-spin ${duration} linear infinite ${reverse ? "reverse" : "normal"}`,
        }}
      >
        <Icon className="size-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function OrbitDiagram() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[340px]">
      <div
        className="absolute inset-0 -z-10 rounded-full blur-3xl"
        style={{
          background:
            "color-mix(in oklch, var(--accent-atomic) 22%, transparent)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex size-20 items-center justify-center rounded-full sm:size-24"
          style={{
            background: "var(--accent-atomic)",
            color: "var(--accent-atomic-foreground)",
            animation: "atomic-pulse 3s ease-in-out infinite",
          }}
        >
          <CheckCheck className="size-8 sm:size-9" />
        </div>
      </div>
      <OrbitRing size="60%" duration="9s" icon={GitBranch} />
      <OrbitRing size="80%" duration="15s" reverse icon={Flame} />
      <OrbitRing size="100%" duration="21s" icon={BarChart3} />
    </div>
  );
}

export function AtomMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {[0, 60, 120].map((rotation) => (
        <ellipse
          key={rotation}
          cx="12"
          cy="12"
          rx="10"
          ry="4.2"
          stroke="currentColor"
          strokeWidth="1.4"
          transform={`rotate(${rotation} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.4" fill="var(--accent-atomic)" />
    </svg>
  );
}
