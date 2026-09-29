"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PanelAuthGuard, usePanelAuth } from "@/components/panel/auth";
import { AuthCard, ChangePasswordForm } from "@/components/panel/auth-forms";
import { useToast } from "@/components/ui";

function Inner() {
  const { me, logout } = usePanelAuth();
  const router = useRouter();
  const toast = useToast();
  const forced = me.user.mustChangePassword;
  return (
    <AuthCard portal="partner">
      <h1 className="text-xl font-semibold text-ink">{forced ? "Set your password" : "Change password"}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        {forced ? `Welcome${me.user.name ? `, ${me.user.name}` : ""}! For security, choose a new password before continuing.` : "Choose a new password for your account."}
      </p>
      <ChangePasswordForm
        forced={forced}
        onDone={() => {
          toast.success("Password updated");
          router.replace("/partner");
        }}
      />
      <div className="mt-4 flex justify-between text-sm">
        {forced ? <span /> : <Link href="/partner" className="text-muted hover:text-ink">← Back to dashboard</Link>}
        <button type="button" className="text-muted hover:text-ink" onClick={() => logout()}>
          Log out
        </button>
      </div>
    </AuthCard>
  );
}

export function ChangePasswordScreen() {
  return (
    <PanelAuthGuard portal="partner" allowPasswordChange>
      <Inner />
    </PanelAuthGuard>
  );
}
