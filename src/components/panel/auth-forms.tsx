"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { AuthResponse } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui";
import type { Portal } from "./auth";

const TITLES: Record<Portal, { title: string; subtitle: string }> = {
  admin: { title: "Admin console", subtitle: "Sign in with your BookMeStays staff account." },
  partner: { title: "Partner panel", subtitle: "Manage your properties, rates, bookings and payouts." },
};

export function AuthCard({ children, portal }: { children: React.ReactNode; portal: Portal }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">B</span>
          <span className="text-lg font-semibold text-ink">
            BookMeStays <span className="font-normal text-muted">{portal === "admin" ? "Admin" : "Partner"}</span>
          </span>
        </div>
        <Card className="p-6 shadow-sm">{children}</Card>
      </div>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ portal }: { portal: Portal }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(sp.get("reason") === "role" ? `This account can't access the ${portal} panel.` : null);
  const next = sp.get("next");
  const safeNext = next && next.startsWith(`/${portal}`) && !next.startsWith(`/${portal}/login`) ? next : `/${portal}`;

  return (
    <AuthCard portal={portal}>
      <h1 className="text-xl font-semibold text-ink">{TITLES[portal].title}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">{TITLES[portal].subtitle}</p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!identifier.trim() || !password) {
            setError("Enter your email/phone and password.");
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const res = await api<AuthResponse>("/auth/login", { method: "POST", body: { identifier: identifier.trim(), password, portal } });
            if (portal === "partner" && res.user.mustChangePassword) router.replace("/partner/change-password");
            else router.replace(safeNext);
          } catch (err) {
            setError(errorMessage(err, "Could not sign in."));
            setBusy(false);
          }
        }}
      >
        <Field label="Email or phone">
          <Input autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus aria-invalid={!!error} />
        </Field>
        <Field label="Password">
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          <Lock className="size-4" /> Sign in
        </Button>
      </form>
      {portal === "partner" && (
        <p className="mt-5 text-center text-sm text-muted">
          New to BookMeStays?{" "}
          <Link href="/partner/register" className="font-medium text-brand hover:underline">
            List your property
          </Link>
        </p>
      )}
    </AuthCard>
  );
}

/** Partner self-registration: creates the owner login + business and signs them in. */
export function RegisterForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problems = passwordProblems(password);
  const errs = {
    businessName: businessName.trim().length < 2 ? "Enter your property or business name" : null,
    contactName: contactName.trim().length < 2 ? "Enter your name" : null,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? "Enter a valid email" : null,
    phone: phone.replace(/\D/g, "").length < 10 ? "Enter a valid phone number" : null,
    password: problems.length ? `Use ${problems.join(" and ")}` : null,
  };
  const invalid = Object.values(errs).some(Boolean);

  return (
    <AuthCard portal="partner">
      <h1 className="text-xl font-semibold text-ink">List your property</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Create a partner account, add your property, and go live after a quick review by our team.</p>
      <form
        noValidate
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (invalid) return;
          setBusy(true);
          setError(null);
          try {
            await api<AuthResponse>("/auth/partner/register", {
              method: "POST",
              body: { businessName: businessName.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim(), password },
            });
            router.replace("/partner");
          } catch (err) {
            setError(errorMessage(err, "Could not create your account."));
            setBusy(false);
          }
        }}
      >
        <Field label="Property / business name" required error={touched ? errs.businessName : null}>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoFocus aria-invalid={touched && !!errs.businessName} />
        </Field>
        <Field label="Your name" required error={touched ? errs.contactName : null}>
          <Input autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)} aria-invalid={touched && !!errs.contactName} />
        </Field>
        <Field label="Email" required error={touched ? errs.email : null}>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={touched && !!errs.email} />
        </Field>
        <Field label="Phone" required error={touched ? errs.phone : null}>
          <Input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={touched && !!errs.phone} />
        </Field>
        <Field label="Password" required error={touched ? errs.password : null} hint="At least 8 characters with letters and numbers.">
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={touched && !!errs.password} />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          <UserPlus className="size-4" /> Create partner account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already a partner?{" "}
        <Link href="/partner/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export function passwordProblems(pw: string) {
  const p: string[] = [];
  if (pw.length < 8) p.push("at least 8 characters");
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) p.push("letters and numbers");
  return p;
}

export function ChangePasswordForm({ forced, onDone }: { forced?: boolean; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const problems = passwordProblems(pw);
  const mismatch = confirm.length > 0 && pw !== confirm;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (problems.length || pw !== confirm) return;
        setBusy(true);
        setError(null);
        try {
          await api("/auth/change-password", { method: "POST", body: { currentPassword: current || undefined, newPassword: pw } });
          onDone();
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <Field label={forced ? "Temporary password" : "Current password"} hint={forced ? "The password you received from BookMeStays." : undefined} required>
        <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </Field>
      <Field label="New password" required error={touched && problems.length ? `Use ${problems.join(" and ")}` : null} hint="At least 8 characters with letters and numbers.">
        <PasswordInput autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={touched && problems.length > 0} />
      </Field>
      <Field label="Confirm new password" required error={mismatch ? "Passwords don't match" : null}>
        <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy}>
        Update password
      </Button>
    </form>
  );
}
