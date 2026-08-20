"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button, Field, Input } from "@/components/admin/ui";
import { Logo } from "@/components/layout/Logo";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter both an email and a password.");
      return;
    }

    /* No auth backend yet — this only exercises the loading and error states.
       The real handler will POST credentials, receive an httpOnly session
       cookie, and redirect on success. */
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      router.push("/admin");
    }, 700);
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <div className="mb-8 lg:hidden">
        <Logo size="md" href={null} />
      </div>

      <h1 className="font-display text-2xl font-extrabold text-ink">
        Sign in to Admin
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Use the account your store owner set up for you.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        <Field label="Email address" required>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@kidscares.example"
          />
        </Field>

        <Field label="Password" required>
          <span className="relative block">
            <Input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              defaultChecked
              className="size-3.5 accent-[var(--color-brand-500)]"
            />
            Keep me signed in
          </label>
          <button
            type="button"
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Sign in
            </>
          )}
        </Button>
      </div>

      <p className="mt-6 rounded-xl bg-white px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted ring-1 ring-line">
        <b className="text-ink">Preview build.</b> Authentication is not wired
        yet — any email and password will take you through to the dashboard.
      </p>
    </form>
  );
}
