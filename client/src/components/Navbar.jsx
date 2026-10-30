import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Atom, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

const calmLightMessages = [
  "Small daily actions compound into remarkable results.",
  "Focus on your next atomic action today.",
  "Consistency beats intensity every single time.",
  "Build a daily rhythm you can sustain effortlessly.",
  "Clear your smallest open loop. Own your day.",
  "Progress is built one small habit at a time.",
  "A calm system keeps momentum moving forward.",
  "Show up today. Let compounding do the rest.",
];

const playfulDarkMessages = [
  "✨ Dark mode engaged. Productivity +10%.",
  "🌌 Deep focus mode active. Make it count.",
  "🖤 Calm workspace, clear priorities.",
  "🦉 Focused night rhythm. Keep the signal strong.",
  "☕ Night mode on. Calm progress awaits.",
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    const stored = window.localStorage.getItem("atomictask-theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [darkMessage, setDarkMessage] = useState("");
  const [showDarkMessage, setShowDarkMessage] = useState(false);
  const darkTimerRef = useRef(null);
  const lightIntervalRef = useRef(null);
  const prevIsDarkRef = useRef(isDark);

  const handleThemeChange = useCallback((theme) => {
    setIsDark(theme === "dark");
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Light mode message rotator
  useEffect(() => {
    if (!isDark) {
      const hideDarkMessageTimer = window.setTimeout(
        () => setShowDarkMessage(false),
        0,
      );
      if (darkTimerRef.current) clearTimeout(darkTimerRef.current);

      const showRandomLightMessage = () => {
        const randomIndex = Math.floor(
          Math.random() * calmLightMessages.length,
        );
        setMessage(calmLightMessages[randomIndex]);
        setShowMessage(true);
      };

      showRandomLightMessage();
      lightIntervalRef.current = setInterval(showRandomLightMessage, 60000);

      return () => {
        clearTimeout(hideDarkMessageTimer);
        if (lightIntervalRef.current) {
          clearInterval(lightIntervalRef.current);
          lightIntervalRef.current = null;
        }
      };
    }
    return undefined;
  }, [isDark]);

  // Dark mode transition message
  useEffect(() => {
    const wasDark = prevIsDarkRef.current;
    prevIsDarkRef.current = isDark;

    if (wasDark !== isDark) {
      if (isDark) {
        if (darkTimerRef.current) clearTimeout(darkTimerRef.current);
        const showDarkMessageTimer = window.setTimeout(() => {
          const randomIndex = Math.floor(
            Math.random() * playfulDarkMessages.length,
          );
          setDarkMessage(playfulDarkMessages[randomIndex]);
          setShowDarkMessage(true);
        }, 0);
        darkTimerRef.current = setTimeout(() => {
          setShowDarkMessage(false);
        }, 5000);
        return () => {
          clearTimeout(showDarkMessageTimer);
          if (darkTimerRef.current) clearTimeout(darkTimerRef.current);
        };
      }
    }

    return () => {
      if (darkTimerRef.current) clearTimeout(darkTimerRef.current);
    };
  }, [isDark]);

  const guestLinks = [
    ["Habit", "/#habits"],
    ["Task", "/#ai-tasks"],
    ["How It Works", "/#how-it-works"],
    ["Pricing", "/#pricing"],
  ];

  const authLinks = [
    ["Dashboard", "/dashboard"],
    ["Tasks", "/tasks"],
    ["Habits", "/habits"],
  ];

  const links = user ? authLinks : guestLinks;

  const handleNavClick = (href) => {
    if (href.startsWith("/#") && window.location.pathname === "/") {
      const id = href.replace("/#", "");
      const elem = document.getElementById(id);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="sticky top-4 z-50 flex w-full flex-col items-center px-4 transition-all duration-300">
      <nav
        className={`
          flex w-full items-center justify-between gap-3 rounded-full border border-border/80 bg-background/80 px-5 py-2.5 backdrop-blur-md shadow-sm transition-all duration-300
          ${isScrolled ? "max-w-[860px] py-2" : "max-w-[1000px] py-2.5"}
        `}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2 font-heading text-lg font-semibold tracking-tight text-foreground no-underline transition-opacity hover:opacity-70"
        >
          <Atom className="size-5 text-[var(--accent-atomic)]" />
          <span>AtomicTask</span>
        </Link>

        {/* Center links */}
        {links.length > 0 && (
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 sm:flex">
            {links.map(([label, href]) => (
              <Link
                key={label}
                to={href}
                onClick={() => handleNavClick(href)}
                className="relative text-sm font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[var(--accent-atomic)] after:transition-transform after:duration-200 hover:after:scale-x-100"
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle onThemeChange={handleThemeChange} />

          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                {user.name || user.email?.split("@")[0]}
              </span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                title="Log out"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground sm:block"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-1.5 rounded-full bg-[var(--accent-atomic)] px-4 py-2 text-sm font-extrabold text-[var(--accent-atomic-foreground)] no-underline transition-all duration-200 hover:brightness-105 active:scale-95"
              >
                Get started
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Message container */}
      <div
        className={`mt-2 w-full ${isScrolled ? "max-w-[760px]" : "max-w-[1000px]"} pr-5 text-right h-6 overflow-hidden`}
      >
        {isDark ? (
          <p
            className={`text-xs font-medium text-accent-atomic transition-opacity duration-300 ${
              showDarkMessage ? "opacity-100" : "opacity-0"
            }`}
          >
            {darkMessage}
          </p>
        ) : (
          <p
            className={`text-xs text-muted-foreground/60 italic transition-opacity duration-500 hover:text-muted-foreground/90 ${
              showMessage ? "opacity-100" : "opacity-0"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
