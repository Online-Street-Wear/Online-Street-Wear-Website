import { useAuth } from "@getmocha/users-service/react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, LogIn, Mail, ShoppingBag, KeyRound, ShieldCheck } from "lucide-react";

type LoginMethod = "google" | "email";

export default function Login() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("google");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (user && !isPending) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  const handleGoogleLogin = async () => {
    setEmailMessage("");
    setIsRedirecting(true);

    try {
      await redirectToLogin();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setEmailMessage("Could not start Google sign-in. Please try again.");
      setIsRedirecting(false);
    }
  };

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setEmailMessage("Enter your email and password to continue.");
      return;
    }

    setEmailMessage(
      "Email login UI is ready, but your backend currently supports Google OAuth only. Use Google for now."
    );
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse text-lg tracking-wide">Loading account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.28),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(153,27,27,0.35),transparent_35%),linear-gradient(to_bottom,rgba(0,0,0,0.86),#000)]" />

      <div className="relative min-h-screen grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-center px-10 xl:px-20">
          <p className="text-sm uppercase tracking-[0.35em] text-red-400 mb-5">Online Streetwear</p>
          <h1
            className="text-7xl xl:text-8xl leading-[0.9] tracking-tighter mb-6"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            WELCOME
            <br />
            BACK
          </h1>
          <p className="text-gray-300 max-w-md text-lg leading-relaxed mb-8">
            Sign in to track orders, save your cart, and access new drops first.
          </p>
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <ShieldCheck className="w-5 h-5 text-red-400" />
              Secure sessions and checkout history
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <ShieldCheck className="w-5 h-5 text-red-400" />
              Faster checkout with saved details
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <ShieldCheck className="w-5 h-5 text-red-400" />
              Early access to limited collections
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl leading-none" style={{ fontFamily: "Anton, sans-serif" }}>
                  SIGN IN
                </h2>
                <p className="text-xs text-gray-400 mt-1">Choose your preferred login method</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 mb-6 rounded-xl border border-white/10 bg-white/5">
              <button
                onClick={() => {
                  setLoginMethod("google");
                  setEmailMessage("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "google"
                    ? "bg-red-500 text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                Google
              </button>
              <button
                onClick={() => setLoginMethod("email")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "email"
                    ? "bg-red-500 text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                Email
              </button>
            </div>

            {loginMethod === "google" ? (
              <div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isRedirecting}
                  className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-semibold py-3.5 px-5 rounded-xl transition"
                >
                  {isRedirecting ? (
                    "Redirecting..."
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Continue with Google
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Recommended for fastest sign-in.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-10 py-3 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-10 py-3 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 px-5 rounded-xl transition"
                >
                  Continue with Email
                </button>
              </form>
            )}

            {emailMessage && (
              <p className="text-sm text-amber-300 mt-4 text-center">
                {emailMessage}
              </p>
            )}

            <div className="mt-7 pt-5 border-t border-white/10">
              <p className="text-center text-xs text-gray-400">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="mt-6 flex items-center justify-center gap-2 w-full text-sm text-gray-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
