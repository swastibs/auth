import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const STYLES = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const InlineMessage = ({ type = "info", children, className = "" }) => {
  const Icon = ICONS[type] ?? Info;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${STYLES[type] ?? STYLES.info} ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default InlineMessage;
