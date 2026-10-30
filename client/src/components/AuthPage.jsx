import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import "./AuthPage.css";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

function FieldError({ error }) {
  return error ? <p className="auth-field-error">{error.message}</p> : null;
}

const resolvePostAuthPath = () => {
  const next = new URLSearchParams(window.location.search).get("next");
  return next ? decodeURIComponent(next) : "/dashboard";
};

export default function AuthPage({ initialMode = "login" }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(initialMode === "signup");
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");
  const navigationTimer = useRef(null);
  const loginForm = useForm({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => () => window.clearTimeout(navigationTimer.current), []);

  const switchMode = (nextIsSignup) => {
    if (nextIsSignup === isSignup) return;
    setIsSignup(nextIsSignup);
    window.clearTimeout(navigationTimer.current);
    navigationTimer.current = window.setTimeout(
      () => navigate(nextIsSignup ? "/signup" : "/login"),
      560,
    );
  };

  const submitLogin = async (data) => {
    try {
      setLoginError("");
      await login(data.email, data.password);
      navigate(resolvePostAuthPath());
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.normalized?.message ||
        error.message ||
        "Login failed";
      setLoginError(message);
    }
  };

  const submitSignup = async (data) => {
    try {
      setSignupError("");
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      navigate("/dashboard");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.normalized?.message ||
        error.message ||
        "Signup failed";
      setSignupError(message);
    }
  };

  return (
    <main className="auth-page">
      {/* Background glows */}
      <div className="auth-page-glow auth-page-glow-one" />
      <div className="auth-page-glow auth-page-glow-two" />

      {/* Navbar */}
      <Navbar />

      {/* Slider container */}
      <div className="auth-slider-wrapper">
        <section
          className={`auth-slider ${isSignup ? "is-signup" : "is-login"}`}
          aria-label="Account access"
        >
          {/* Login panel */}
          <div className="auth-form-panel auth-login-panel">
            <form
              className="auth-form"
              onSubmit={loginForm.handleSubmit(submitLogin)}
              noValidate
            >
              <span className="auth-kicker">Welcome back</span>
              <h1>Pick up where you left off.</h1>
              <p>
                Return to today&apos;s focused plan and keep your momentum
                moving.
              </p>
              <div className="auth-fields">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    {...loginForm.register("email")}
                  />
                  <FieldError error={loginForm.formState.errors.email} />
                </div>
                <div>
                  <div className="auth-label-row">
                    <Label htmlFor="login-password">Password</Label>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    {...loginForm.register("password")}
                  />
                  <FieldError error={loginForm.formState.errors.password} />
                </div>
              </div>
              {loginError && <p className="auth-api-error">{loginError}</p>}
              <Button
                type="submit"
                className="auth-submit"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting ? "Logging in…" : "Log in"}
                <ArrowRight />
              </Button>
              <button
                type="button"
                className="auth-mobile-switch"
                onClick={() => switchMode(true)}
              >
                New here? <span>Create an account</span>
              </button>
            </form>
          </div>

          {/* Signup panel */}
          <div className="auth-form-panel auth-signup-panel">
            <form
              className="auth-form"
              onSubmit={signupForm.handleSubmit(submitSignup)}
              noValidate
            >
              <span className="auth-kicker">Start small, today</span>
              <h1>Build a calmer system.</h1>
              <p>
                Create your account and turn your next intention into a clear
                action.
              </p>
              <div className="auth-fields">
                <div>
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your name"
                    {...signupForm.register("name")}
                  />
                  <FieldError error={signupForm.formState.errors.name} />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signupForm.register("email")}
                  />
                  <FieldError error={signupForm.formState.errors.email} />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 4 characters"
                    {...signupForm.register("password")}
                  />
                  <FieldError error={signupForm.formState.errors.password} />
                </div>
              </div>
              {signupError && <p className="auth-api-error">{signupError}</p>}
              <Button
                type="submit"
                className="auth-submit"
                disabled={signupForm.formState.isSubmitting}
              >
                {signupForm.formState.isSubmitting
                  ? "Creating account…"
                  : "Create account"}
                <ArrowRight />
              </Button>
              <button
                type="button"
                className="auth-mobile-switch"
                onClick={() => switchMode(false)}
              >
                Already have an account? <span>Log in</span>
              </button>
            </form>
          </div>

          <aside className="auth-overlay" aria-hidden="true">
            <div className="auth-overlay-track">
              <div className="auth-overlay-copy auth-overlay-login">
                <span className="auth-orbit">
                  <Sparkles />
                </span>
                <span className="auth-kicker">New to AtomicTask?</span>
                <h2>Make the next step obvious.</h2>
                <p>
                  Build a personal rhythm for the tasks and habits that matter.
                </p>
                <button type="button" onClick={() => switchMode(true)}>
                  Create account <ArrowRight />
                </button>
              </div>
              <div className="auth-overlay-copy auth-overlay-signup">
                <span className="auth-orbit">
                  <Check />
                </span>
                <span className="auth-kicker">Already a member?</span>
                <h2>Your plan is ready when you are.</h2>
                <p>
                  Sign in to return to your streaks, priorities, and progress.
                </p>
                <button type="button" onClick={() => switchMode(false)}>
                  Log in <ArrowRight />
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
