import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InlineMessage from "@/components/InlineMessage";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const extractErrorMessage = (error) =>
  error?.normalized?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    setError("");
    setSuccess("");
    try {
      await forgotPassword(email);
      setSuccess(
        "If an account exists with that email, a password reset link has been sent.",
      );
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
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email and we'll send you a reset link.
        </p>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 grid gap-4"
          noValidate
        >
          <div>
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {error && <InlineMessage type="error">{error}</InlineMessage>}
          {success && <InlineMessage type="success">{success}</InlineMessage>}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
