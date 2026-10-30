import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InlineMessage from "@/components/InlineMessage";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .refine((v) => /[A-Za-z]/.test(v), {
        message: "Password must contain at least one letter",
      })
      .refine((v) => /\d/.test(v), {
        message: "Password must contain at least one number",
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const extractErrorMessage = (error) =>
  error?.normalized?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const form = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ newPassword }) => {
    setError("");
    setSuccess("");
    if (!token) {
      setError("Missing reset token in URL.");
      return;
    }
    try {
      await resetPassword(token, newPassword);
      setSuccess("Password reset successfully. Redirecting to sign in…");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a strong password. All existing sessions will be revoked for
          your security.
        </p>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 grid gap-4"
          noValidate
        >
          <div>
            <Label htmlFor="rp-new">New password</Label>
            <Input
              id="rp-new"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
            {form.formState.errors.newPassword && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="rp-confirm">Confirm new password</Label>
            <Input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && <InlineMessage type="error">{error}</InlineMessage>}
          {success && <InlineMessage type="success">{success}</InlineMessage>}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {form.formState.isSubmitting ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
