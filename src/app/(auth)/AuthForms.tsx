"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button, Checkbox, Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/store/useAuth";
import { authApi, ApiError } from "@/utils/service";
import { cn } from "@/lib/utils";

/**
 * Auth screens.
 *
 * No backend yet — each form validates locally, shows its loading state, then
 * routes onward. The validation rules are the ones the API will enforce, so
 * messages stay consistent once it is wired.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-2xl border-2 border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-semibold text-brand-700"
    >
      <AlertCircle className="mt-px size-4 shrink-0" />
      {children}
    </p>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <Input
        type={show ? "text" : "password"}
        value={value}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}

/** Live password strength — four independent rules, not a vague meter. */
function strengthOf(pw: string) {
  const rules = [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), label: "One uppercase letter" },
    { ok: /\d/.test(pw), label: "One number" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "One symbol" },
  ];
  return { rules, score: rules.filter((r) => r.ok).length };
}

/* ------------------------------------------------------------------ login */

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuth((s) => s.setUser);
  /* Where the visitor was headed before the gate intercepted them. Relative
     paths only — an absolute URL here would be an open redirect. */
  const raw = params.get("next") ?? "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = id.trim();

    if (!EMAIL_RE.test(clean) && !PHONE_RE.test(clean.replace(/\s|-/g, ""))) {
      setError("Enter a valid email address or 10-digit mobile number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const data = await authApi.login({ identifier: clean, password });
      setUser(data.user);
      // replace, not push: the login page should not sit in history behind
      // the page the visitor was trying to reach.
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not sign in. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Sign in to track orders and see your saved items.
      </p>

      {next !== "/account" && (
        <p className="mt-3 rounded-2xl bg-cream px-3.5 py-2.5 text-xs font-semibold text-ink-soft">
          Sign in to continue — we will take you straight back.
        </p>
      )}

      {error && <div className="mt-5">{<ErrorNote>{error}</ErrorNote>}</div>}

      <div className="mt-6 space-y-4">
        <Field label="Email or mobile number" required>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            invalid={!!error}
          />
        </Field>

        <Field label="Password" required>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />
          <Link
            href="/forgot-password"
            className="shrink-0 text-xs font-bold text-brand-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to KidsCares?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="font-bold text-brand-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

/* ----------------------------------------------------------------- signup */

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next") ?? "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  const [v, setV] = useState({ name: "", email: "", phone: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { rules, score } = strengthOf(v.password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return setError("Enter your name.");
    if (!EMAIL_RE.test(v.email)) return setError("Enter a valid email address.");
    if (!PHONE_RE.test(v.phone.replace(/\s|-/g, "")))
      return setError("Enter a valid 10-digit mobile number.");
    if (score < 3)
      return setError("Pick a stronger password — meet at least three rules below.");
    if (!agree) return setError("Please accept the Terms and Privacy Policy.");

    setError("");
    setBusy(true);
    try {
      /* Sends the code and returns delivery timings. The account is only
         created once the code is verified, so an abandoned signup leaves
         nothing behind. */
      await authApi.requestSignupOtp({ name: v.name, email: v.email, phone: v.phone });

      router.push(
        `/verify-otp?to=${encodeURIComponent(v.email)}` +
          `&name=${encodeURIComponent(v.name)}` +
          `&phone=${encodeURIComponent(v.phone)}` +
          `&pw=1` +
          `&next=${encodeURIComponent(next)}`,
      );
      // The password is handed to the verify step in memory, never in the URL.
      sessionStorage.setItem("kc_signup_pw", v.password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send the code. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">
        One account for orders, wishlist and faster checkout.
      </p>

      {error && <div className="mt-5">{<ErrorNote>{error}</ErrorNote>}</div>}

      <div className="mt-6 space-y-4">
        <Field label="Full name" required>
          <Input
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            placeholder="Rahul Agarwal"
            autoComplete="name"
          />
        </Field>

        <Field label="Email address" required>
          <Input
            type="email"
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Mobile number" required hint="For delivery updates">
          <Input
            value={v.phone}
            onChange={(e) => setV({ ...v, phone: e.target.value })}
            placeholder="98765 43210"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field label="Password" required>
          <PasswordInput
            value={v.password}
            onChange={(pw) => setV({ ...v, password: pw })}
            autoComplete="new-password"
          />
          <span className="mt-2 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < score
                    ? score <= 2
                      ? "bg-brand-400"
                      : score === 3
                        ? "bg-sun-400"
                        : "bg-mint-500"
                    : "bg-line",
                )}
              />
            ))}
          </span>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {rules.map((r) => (
              <li
                key={r.label}
                className={cn(
                  "text-[11px] font-semibold",
                  r.ok ? "text-mint-600" : "text-ink-muted",
                )}
              >
                {r.ok ? "✓ " : "· "}
                {r.label}
              </li>
            ))}
          </ul>
        </Field>

        <Checkbox
          checked={agree}
          onChange={setAgree}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" className="font-bold text-brand-600 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-bold text-brand-600 hover:underline">
                Privacy Policy
              </Link>
            </>
          }
        />

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-bold text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------- forgot password */

export function ForgotPasswordForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = id.trim();
    if (!EMAIL_RE.test(clean) && !PHONE_RE.test(clean.replace(/\s|-/g, ""))) {
      setError("Enter the email or mobile number on your account.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await authApi.forgotPassword(clean);
      router.push(`/verify-otp?to=${encodeURIComponent(clean)}&reset=1`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send the code. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl font-extrabold">Forgot password?</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Enter your email or mobile number and we will send a verification code.
      </p>

      {error && <div className="mt-5">{<ErrorNote>{error}</ErrorNote>}</div>}

      <div className="mt-6 space-y-4">
        <Field label="Email or mobile number" required>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            invalid={!!error}
          />
        </Field>

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending code…
            </>
          ) : (
            "Send verification code"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------- OTP entry */

export function VerifyOtpForm({
  to,
  isReset,
  isSignup,
  next,
}: {
  to: string;
  isReset: boolean;
  /** True when this code completes a signup rather than a sign-in. */
  isSignup: boolean;
  next?: string;
}) {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const setDigit = (i: number, val: string) => {
    const ch = val.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = ch;
      return next;
    });
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  /* Pasting the whole code into the first box should fill every box, which is
     what password managers and SMS autofill actually do. */
  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ""));
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (digits.some((d) => !d)) {
      setError("Enter all six digits.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      if (isReset) {
        // The code is carried to the reset screen, which sends it back with
        // the new password in a single call.
        sessionStorage.setItem("kc_reset", JSON.stringify({ email: to, code }));
        router.push("/reset-password");
        return;
      }

      const password = sessionStorage.getItem("kc_signup_pw") ?? undefined;

      const data = isSignup
        ? await authApi.verifySignupOtp({ email: to, code, password })
        : await authApi.verifyLoginOtp({ email: to, code });

      sessionStorage.removeItem("kc_signup_pw");
      setUser(data.user);
      router.replace(target);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not verify that code.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl font-extrabold">Verify your number</h1>
      <p className="mt-1 text-sm text-ink-soft">
        We sent a 6-digit code to{" "}
        <b className="text-ink">{to || "your registered contact"}</b>.
      </p>

      {error && <div className="mt-5">{<ErrorNote>{error}</ErrorNote>}</div>}

      <div className="mt-6">
        <div className="flex justify-between gap-2" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1}`}
              className="h-14 w-full rounded-2xl border-2 border-line bg-white text-center font-display text-xl font-extrabold text-ink outline-none transition focus:border-brand-400"
            />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          {seconds > 0 ? (
            <>Resend code in {seconds}s</>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  if (isSignup) await authApi.requestLoginOtp(to);
                  else if (isReset) await authApi.forgotPassword(to);
                  else await authApi.requestLoginOtp(to);
                  setSeconds(30);
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Could not resend.");
                }
              }}
              className="font-bold text-brand-600 hover:underline"
            >
              Resend code
            </button>
          )}
        </p>

        <Button type="submit" size="lg" disabled={busy} className="mt-5 w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Wrong number?{" "}
        <Link href="/signup" className="font-bold text-brand-600 hover:underline">
          Go back
        </Link>
      </p>
    </form>
  );
}

/* --------------------------------------------------------- reset password */

export function ResetPasswordForm() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { rules, score } = strengthOf(pw);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 3) return setError("Pick a stronger password.");
    if (pw !== confirm) return setError("The two passwords do not match.");

    const stashed = sessionStorage.getItem("kc_reset");
    if (!stashed) {
      setError("Your reset session expired. Please request a new code.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const { email, code } = JSON.parse(stashed);
      const data = await authApi.resetPassword({ email, code, password: pw });
      sessionStorage.removeItem("kc_reset");
      setUser(data.user);
      router.replace("/account");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update your password.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="font-display text-2xl font-extrabold">Set a new password</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Choose something you have not used before.
      </p>

      {error && <div className="mt-5">{<ErrorNote>{error}</ErrorNote>}</div>}

      <div className="mt-6 space-y-4">
        <Field label="New password" required>
          <PasswordInput value={pw} onChange={setPw} autoComplete="new-password" />
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {rules.map((r) => (
              <li
                key={r.label}
                className={cn(
                  "text-[11px] font-semibold",
                  r.ok ? "text-mint-600" : "text-ink-muted",
                )}
              >
                {r.ok ? "✓ " : "· "}
                {r.label}
              </li>
            ))}
          </ul>
        </Field>

        <Field label="Confirm new password" required>
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={!!confirm && confirm !== pw}
          />
        </Field>

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </div>
    </form>
  );
}
