"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LockKeyhole, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6l6.5 5c3.8-3.5 6.1-8.6 6.1-14.7z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.5-5c-1.8 1.2-4 2-7 2-5.4 0-10-3.7-11.7-8.7l-6.7 5.1C9 39.4 16 44 24 44z" />
      <path fill="#FBBC05" d="M12.3 27.5c-.4-1.1-.6-2.3-.6-3.5s.2-2.4.6-3.5l-6.7-5.1C4.6 18.2 4 21 4 24s.6 5.8 1.6 8.6l6.7-5.1z" />
      <path fill="#EA4335" d="M24 9.3c3 0 5.7 1 7.8 3l5.8-5.8C34.1 3.3 29.5 1 24 1 16 1 9 5.6 5.6 12.9l6.7 5.1C14 13 18.6 9.3 24 9.3z" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("error");
    if (authError === "oauth") {
      setError("Google sign-in is not fully configured yet. Enable Google in Supabase Auth settings and add your Google OAuth credentials.");
    } else if (authError === "callback") {
      setError("The sign-in link could not be verified. Please try signing in again.");
    } else if (authError === "confirmation") {
      setError("That confirmation link may have expired. Request a new link and try again.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseConfigured) {
      setError("Authentication is not configured yet. Please contact the PostPilot administrator.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/dashboard";

        router.push(next);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { workspace_name: "My workspace" } },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setNotice("Check your email inbox for the confirmation link, then sign in.");
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabaseConfigured) {
      setError("Authentication is not configured yet. Please contact the PostPilot administrator.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL("/auth/callback", window.location.origin).toString(),
        },
      });

      if (googleError) throw googleError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3 text-2xl font-extrabold text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white">
            <Send size={19} />
          </span>
          <span>PostPilot</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">Create once. Publish everywhere.</p>

        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm leading-5 text-slate-200">
          Use your own email address. Your PostPilot password is separate from your Instagram, Facebook, and LinkedIn passwords.
        </p>

        {!supabaseConfigured && (
          <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle size={18} className="shrink-0" />
            Authentication is not configured yet. Please contact the PostPilot administrator.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-800 bg-rose-950/70 p-3 text-sm text-rose-100">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/70 p-3 text-sm text-emerald-100">
            {notice}
          </p>
        )}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy || !supabaseConfigured}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark />
          {busy ? "Please wait…" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-700" />
          <span>or use email</span>
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-200">
            Email address
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-200">
            {mode === "login" ? "PostPilot password" : "Create a PostPilot password"}
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "login" ? "Enter your PostPilot password" : "At least 8 characters"}
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>

          <button
            type="submit"
            disabled={busy || !supabaseConfigured}
            className="btn btn-primary w-full justify-center py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          className="mt-5 w-full text-sm font-semibold text-violet-300 transition hover:text-violet-200 disabled:opacity-60"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setNotice("");
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LockKeyhole size={13} />
          Social access tokens are stored server-side.
        </p>
      </section>
    </main>
  );
}
