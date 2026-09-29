"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { useAuth } from "../auth-context";
import { LoginForm } from "../login-form";
import { Logo } from "../primitives";

export function LoginPageClient({ next, mode }: { next: string; mode: "otp" | "signup" }) {
  const router = useRouter();
  const { signedIn, user } = useAuth();
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface-2 px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <h1 className="text-xl font-semibold text-ink">{mode === "signup" ? "Create your account" : "Sign in or sign up"}</h1>
          <p className="text-sm text-muted">Book faster, manage bookings and save your favourite stays.</p>
        </div>
        {user ? (
          <p className="text-center text-sm text-ink-2">
            You&apos;re signed in as <strong>{user.name ?? user.email ?? user.phone}</strong>.{" "}
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => router.push(next)}>
              Continue
            </button>
          </p>
        ) : (
          <LoginForm
            initialMode={mode}
            onSuccess={(u) => {
              signedIn(u);
              router.replace(next);
            }}
          />
        )}
      </Card>
    </div>
  );
}
