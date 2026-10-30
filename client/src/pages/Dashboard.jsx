import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Copy,
  Crown,
  Flame,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  User as UserIcon,
  Zap,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import InlineMessage from "@/components/InlineMessage";

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
};

const initialOf = (name, email) =>
  (name?.trim()?.[0] || email?.trim()?.[0] || "U").toUpperCase();

const extractErrorMessage = (error) =>
  error?.normalized?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-4" style={{ color: "var(--accent-atomic)" }} />
        {label}
      </div>
      <strong className="font-heading text-2xl font-semibold">{value}</strong>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span
        className={`text-right font-medium ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ChangePasswordCard() {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clientError = useMemo(() => {
    if (!form.newPassword) return "";
    if (form.newPassword.length < 8)
      return "New password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword))
      return "New password must contain at least one letter and one number.";
    if (form.newPassword === form.currentPassword)
      return "New password must be different from current password.";
    if (form.confirmPassword && form.confirmPassword !== form.newPassword)
      return "Passwords do not match.";
    return "";
  }, [form]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (clientError) {
      setError(clientError);
      return;
    }
    if (!form.currentPassword || !form.newPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setSuccess("Password changed. All sessions revoked — signing you out…");
      setTimeout(async () => {
        try {
          await logout();
        } catch {
          // ignore — logout clears tokens regardless
        }
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Change password
        </CardTitle>
        <CardDescription>
          Changing your password will sign you out of all devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div>
            <Label htmlFor="cp-current">Current password</Label>
            <Input
              id="cp-current"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm((p) => ({ ...p, currentPassword: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="cp-new">New password</Label>
            <Input
              id="cp-new"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) =>
                setForm((p) => ({ ...p, newPassword: e.target.value }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              8+ characters, at least one letter and one number.
            </p>
          </div>
          <div>
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((p) => ({ ...p, confirmPassword: e.target.value }))
              }
            />
          </div>

          {error && <InlineMessage type="error">{error}</InlineMessage>}
          {success && <InlineMessage type="success">{success}</InlineMessage>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function VerificationCard({ user }) {
  const { resendVerification, refreshProfile } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onResend = async () => {
    setSending(true);
    setMessage("");
    setError("");
    try {
      await resendVerification(user.email);
      setMessage("Verification link sent. Check your inbox (and spam folder).");
      setCooldown(60);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" /> Email verification
        </CardTitle>
        <CardDescription>
          {user.isEmailVerified
            ? "Your email is verified."
            : "Verify your email to unlock account features."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {user.isEmailVerified ? (
          <InlineMessage type="success">
            <strong>{user.email}</strong> is verified.
          </InlineMessage>
        ) : (
          <>
            {message && <InlineMessage type="success">{message}</InlineMessage>}
            {error && <InlineMessage type="error">{error}</InlineMessage>}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onResend} disabled={sending || cooldown > 0}>
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : sending
                    ? "Sending…"
                    : "Resend verification"}
              </Button>
              <Button variant="outline" onClick={refreshProfile}>
                Refresh status
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SessionCard() {
  const { logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoadingAll(true);
    setError("");
    try {
      await logoutAll();
      navigate("/", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-4" /> Sessions
        </CardTitle>
        <CardDescription>
          Sign out of this device, or end every active session.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && <InlineMessage type="error">{error}</InlineMessage>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleLogout} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {loading ? "Signing out…" : "Log out of this device"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogoutAll}
            disabled={loadingAll}
          >
            {loadingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldAlert className="size-4" />
            )}
            {loadingAll ? "Signing out…" : "Log out of all devices"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralCard({ user }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!user.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4" /> Referral
        </CardTitle>
        <CardDescription>
          Share your code — you earn +100 XP for every signup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <code className="flex-1 font-mono text-sm tracking-widest">
            {user.referralCode || "—"}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            disabled={!user.referralCode}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshProfile().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  const greetingName = user.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="grid size-14 place-items-center rounded-2xl text-xl font-bold"
              style={{
                background: "var(--accent-atomic)",
                color: "var(--accent-atomic-foreground)",
              }}
            >
              {initialOf(user.name, user.email)}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                Hey, {greetingName} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome to your AtomicTask dashboard.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.isEmailVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3.5" /> Email verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <AlertCircle className="size-3.5" /> Email not verified
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold capitalize">
              <Crown className="size-3.5" /> {user.subscription?.tier ?? "free"}
            </span>
          </div>
        </header>

        {!user.isEmailVerified && (
          <div className="mb-6">
            <InlineMessage type="warning">
              Your email is not verified yet. Click <em>Resend verification</em>{" "}
              below — then open the link in your inbox.
            </InlineMessage>
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={Zap}
            label="Total XP"
            value={user.totalXp ?? 0}
            hint="Lifetime earned"
          />
          <StatCard
            icon={Crown}
            label="Level"
            value={user.currentLevel ?? 1}
            hint="Current rank"
          />
          <StatCard
            icon={Flame}
            label="Streak"
            value={`${user.currentStreak ?? 0}d`}
            hint="Current"
          />
          <StatCard
            icon={Trophy}
            label="Best streak"
            value={`${user.longestStreak ?? 0}d`}
            hint="All-time"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="size-4" /> Profile
              </CardTitle>
              <CardDescription>Your account identity and metadata.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/70">
              <ProfileRow icon={UserIcon} label="Name" value={user.name} />
              <ProfileRow icon={Mail} label="Email" value={user.email} />
              <ProfileRow icon={Globe} label="Provider" value={user.provider} />
              <ProfileRow icon={Globe} label="Timezone" value={user.timezone} />
              <ProfileRow
                icon={Calendar}
                label="Joined"
                value={formatDate(user.createdAt)}
              />
              <ProfileRow
                icon={Clock}
                label="Last login"
                value={formatDate(user.lastLogin)}
              />
              <ProfileRow icon={Shield} label="Role" value={user.role} />
            </CardContent>
          </Card>

          <div className="grid content-start gap-6">
            <ReferralCard user={user} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-4" /> Subscription
                </CardTitle>
                <CardDescription>
                  Your current plan and renewal status.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/70">
                <ProfileRow
                  icon={Crown}
                  label="Plan"
                  value={user.subscription?.tier ?? "free"}
                />
                <ProfileRow
                  icon={Shield}
                  label="Status"
                  value={user.subscription?.status ?? "none"}
                />
                <ProfileRow
                  icon={Calendar}
                  label="Started"
                  value={formatDate(user.subscription?.startedAt)}
                />
                <ProfileRow
                  icon={Calendar}
                  label="Renews"
                  value={formatDate(user.subscription?.expiresAt)}
                />
              </CardContent>
            </Card>
          </div>

          <VerificationCard user={user} />
          <ChangePasswordCard />
        </div>

        <div className="mt-6">
          <SessionCard />
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          Need to reset your password instead? {" "}
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="font-semibold text-[var(--accent-atomic)] hover:underline"
          >
            Send a reset link
          </button>
        </p>
      </main>
    </div>
  );
}
