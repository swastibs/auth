import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return undefined;
    }
    let cancelled = false;

    (async () => {
      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(
          result?.message || "Email verified successfully. You may now sign in.",
        );
        setTimeout(() => {
          if (!cancelled) navigate("/login", { replace: true });
        }, 3000);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error?.normalized?.message ||
            error?.response?.data?.message ||
            "This verification link is invalid or has expired.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-[var(--accent-atomic)]" />
            <h1 className="mt-4 font-heading text-xl font-semibold">
              Verifying your email…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Just a moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h1 className="mt-4 font-heading text-xl font-semibold">
              Email verified
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Redirecting to sign in…
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => navigate("/login", { replace: true })}
            >
              Go to sign in
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto size-12 text-destructive" />
            <h1 className="mt-4 font-heading text-xl font-semibold">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => navigate("/login", { replace: true })}>
                Go to sign in
              </Button>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[var(--accent-atomic)] hover:underline"
              >
                Need a new link? Sign in and resend →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
