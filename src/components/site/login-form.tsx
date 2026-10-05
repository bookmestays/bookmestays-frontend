"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AuthResponse, User } from "@/lib/types";

type Mode = "otp" | "password" | "signup";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't reach the server. Check your connection and try again.");

function normaliseTarget(v: string) {
  const t = v.trim();
  if (t.includes("@")) return t.toLowerCase();
  const digits = t.replace(/[^\d+]/g, "");
  return /^\d{10}$/.test(digits) ? `+91${digits}` : digits;
}
const isValidEmail = (t: string) => /^\S+@\S+\.\S+$/.test(t);

export function LoginForm({
  onSuccess,
  initialMode = "otp",
  compact,
}: {
  onSuccess: (user: User) => void;
  initialMode?: Mode;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="flex flex-col gap-5">
      {mode !== "signup" && (
        <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 text-sm">
          {(
            [
              ["otp", "Email code", Mail],
              ["password", "Password", KeyRound],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
                mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "otp" && <OtpForm onSuccess={onSuccess} />}
      {mode === "password" && <PasswordForm onSuccess={onSuccess} />}
      {mode === "signup" && <SignupForm onSuccess={onSuccess} />}

      <p className={cn("text-center text-sm text-muted", compact && "text-xs")}>
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => setMode("otp")}>
              Sign in
            </button>
          </>
        ) : (
          <>
            New to BookMeStays?{" "}
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => setMode("signup")}>
              Create an account
            </button>
            <span className="block pt-1 text-xs">Signing in with a code creates your account automatically.</span>
          </>
        )}
      </p>
      <p className="text-center text-xs text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function OtpForm({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(e?: FormEvent) {
    e?.preventDefault();
    const t = target.trim().toLowerCase();
    if (!isValidEmail(t)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<{ sent: boolean; target: string }>("/auth/otp/request", { method: "POST", body: { target: t } });
      setStep("verify");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError("Enter the code we emailed you.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuthResponse>("/auth/otp/verify", {
        method: "POST",
        body: { target: target.trim().toLowerCase(), code: code.trim(), name: name.trim() || undefined },
      });
      onSuccess(res.user);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  if (step === "request") {
    return (
      <form onSubmit={request} className="flex flex-col gap-4" noValidate>
        <Field label="Email address" hint="We'll email you a 6-digit code." error={error}>
          <Input
            autoFocus
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-invalid={!!error}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
      <button type="button" onClick={() => setStep("request")} className="inline-flex items-center gap-1 self-start text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {target.trim().toLowerCase()}
      </button>
      <p className="text-sm text-muted">We&apos;ve emailed a 6-digit code to you. Check your spam folder if it doesn&apos;t arrive.</p>
      <Field label="Verification code" error={error}>
        <Input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!error}
          className="tracking-[0.3em]"
        />
      </Field>
      <Field label="Your name" hint="Only needed if you're new here.">
        <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
      </Field>
      <Button type="submit" size="lg" loading={busy}>
        Verify &amp; continue
      </Button>
      <button type="button" onClick={() => request()} disabled={busy} className="text-sm font-medium text-brand hover:underline disabled:opacity-50">
        Resend code
      </button>
    </form>
  );
}

function PasswordForm({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your email/phone and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { identifier: normaliseTarget(identifier), password, portal: "web" },
      });
      onSuccess(res.user);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email or mobile number">
        <Input autoFocus autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
      <Field label="Password" error={error}>
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
      </Field>
      <Button type="submit" size="lg" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}

function SignupForm({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Please enter your name.");
    if (!isValidEmail(form.email.trim())) return setError("Please enter a valid email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() ? normaliseTarget(form.phone) : undefined,
          password: form.password,
        },
      });
      onSuccess(res.user);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h3 className="text-base font-semibold text-ink">Create your account</h3>
      <Field label="Full name" required>
        <Input autoFocus autoComplete="name" value={form.name} onChange={set("name")} />
      </Field>
      <Field label="Email" required>
        <Input type="email" autoComplete="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Mobile number" hint="For booking updates">
        <Input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label="Password" required error={error} hint="At least 8 characters">
        <Input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
      </Field>
      <Button type="submit" size="lg" loading={busy}>
        Create account
      </Button>
    </form>
  );
}
