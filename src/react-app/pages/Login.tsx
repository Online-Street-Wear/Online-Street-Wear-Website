import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";

type LoginMethod = "google" | "email";
type AuthMode = "signin" | "signup";

function getFirebaseAuthMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "This email is already registered. Choose Sign In instead.";
    case "auth/weak-password":
      return "Use a stronger password (at least 6 characters).";
    case "auth/missing-password":
      return "Please enter a password.";
    case "auth/popup-blocked":
      return "Popup was blocked. Allow popups and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before completion.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Add your Netlify domain in Firebase Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and retry.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export default function Login() {
  const { user, isPending, isConfigured, redirectToLogin, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("google");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (user && !isPending) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setEmailMessage("");
    if (mode === "signin") {
      setConfirmPassword("");
    }
  };

  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      setEmailMessage("Firebase auth is not configured yet. Add VITE_FIREBASE_* variables and redeploy.");
      return;
    }

    setEmailMessage("");
    setIsRedirecting(true);

    try {
      await redirectToLogin();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setEmailMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!isConfigured) {
      setEmailMessage("Firebase auth is not configured yet. Add VITE_FIREBASE_* variables and redeploy.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password.trim()) {
      setEmailMessage("Enter your email and password to continue.");
      return;
    }

    if (authMode === "signup" && password.length < 6) {
      setEmailMessage("Use at least 6 characters for your password.");
      return;
    }

    if (authMode === "signup" && password !== confirmPassword) {
      setEmailMessage("Password confirmation does not match.");
      return;
    }

    setEmailMessage("");
    setIsEmailLoading(true);

    try {
      if (authMode === "signup") {
        await registerWithEmail(trimmedEmail, password);
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (error) {
      console.error("Email authentication failed:", error);
      setEmailMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsEmailLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse text-lg tracking-wide">Loading account...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_15%,rgba(249,115,22,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(220,38,38,0.22),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(59,130,246,0.16),transparent_35%),linear-gradient(170deg,#09090b_25%,#0a0a0a_60%,#030303_100%)]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-12 lg:py-10">
        <section className="flex flex-col justify-center">
          <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/30 bg-orange-300/10 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-orange-200">
            <span className="h-2 w-2 rounded-full bg-orange-300" />
            Online Streetwear
          </p>

          <h1
            className="mb-5 text-5xl leading-[0.9] tracking-tight sm:text-6xl lg:text-8xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            STAY READY
            <br />
            FOR THE NEXT DROP
          </h1>

          <p className="mb-8 max-w-xl text-base text-zinc-300 sm:text-lg">
            Sign in to track orders, save your cart, and get access to exclusive launches before public release.
          </p>

          <div className="grid gap-3 sm:max-w-lg">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-orange-300" />
              Secure sessions and order history
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-orange-300" />
              Fast checkout with saved details
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              <ShieldCheck className="h-4 w-4 text-orange-300" />
              Early access to limited collections
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-zinc-900/70 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-300/35 bg-orange-300/10">
                  <ShoppingBag className="h-5 w-5 text-orange-200" />
                </div>
                <div>
                  <h2 className="text-3xl leading-none" style={{ fontFamily: "Anton, sans-serif" }}>
                    {authMode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    {authMode === "signup"
                      ? "New here? Start your account in under a minute."
                      : "Welcome back. Pick how you want to continue."}
                  </p>
                </div>
              </div>
              {authMode === "signup" && (
                <span className="rounded-full border border-green-300/25 bg-green-300/10 px-3 py-1 text-xs font-medium text-green-200">
                  First-time user
                </span>
              )}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  authMode === "signin" ? "bg-white text-zinc-900" : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  authMode === "signup" ? "bg-white text-zinc-900" : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 p-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("google");
                  setEmailMessage("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "google" ? "bg-orange-400 text-zinc-950" : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("email");
                  setEmailMessage("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "email" ? "bg-orange-400 text-zinc-950" : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                Email
              </button>
            </div>

            {loginMethod === "google" ? (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isRedirecting}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-orange-400 px-5 py-3.5 font-semibold text-zinc-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-orange-300/60"
                >
                  {isRedirecting ? (
                    "Redirecting..."
                  ) : authMode === "signup" ? (
                    <>
                      <UserPlus className="h-5 w-5" />
                      Continue with Google (Sign Up)
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Continue with Google
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-zinc-400">
                  {authMode === "signup"
                    ? "Google can create your account automatically on first login."
                    : "Fastest way to sign in and sync your account."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/15 bg-black/35 px-10 py-3 text-white placeholder:text-zinc-500 focus:border-orange-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={authMode === "signup" ? "Create a password" : "Enter your password"}
                      className="w-full rounded-xl border border-white/15 bg-black/35 px-10 py-3 pr-11 text-white placeholder:text-zinc-500 focus:border-orange-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authMode === "signup" && (
                  <div>
                    <label className="mb-2 block text-sm text-zinc-300">Confirm password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        className="w-full rounded-xl border border-white/15 bg-black/35 px-10 py-3 pr-11 text-white placeholder:text-zinc-500 focus:border-orange-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="w-full rounded-xl bg-orange-400 px-5 py-3.5 font-semibold text-zinc-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-orange-300/60"
                >
                  {isEmailLoading
                    ? "Please wait..."
                    : authMode === "signup"
                      ? "Create account with email"
                      : "Continue with email"}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode(authMode === "signup" ? "signin" : "signup")}
                  className="w-full text-sm text-zinc-300 transition hover:text-white"
                >
                  {authMode === "signup" ? "Already have an account? Switch to Sign In" : "First time here? Create an account"}
                </button>
              </form>
            )}

            {emailMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{emailMessage}</p>
              </div>
            )}

            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-center text-xs text-zinc-400">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-zinc-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
