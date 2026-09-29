"use client";

import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui";
import { CopyButton } from "@/components/panel/page";

/** Shows a freshly generated temporary password once, with copy buttons. */
export function CredentialsDialog({
  open,
  onClose,
  login,
  tempPassword,
  title = "Login credentials",
  footer,
  note,
}: {
  open: boolean;
  onClose: () => void;
  login: string | null | undefined;
  tempPassword: string;
  title?: string;
  footer?: ReactNode;
  note?: ReactNode;
}) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/partner/login` : "/partner/login";
  const all = `Partner panel: ${url}\nLogin: ${login ?? ""}\nTemporary password: ${tempPassword}`;
  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-ink">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>This temporary password is shown only once. Share it securely — the partner will be asked to set a new password at first login.</p>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <dt className="text-xs text-muted">Partner panel</dt>
              <dd className="truncate font-medium">{url}</dd>
            </div>
            <CopyButton value={url} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <dt className="text-xs text-muted">Login</dt>
              <dd className="truncate font-medium">{login}</dd>
            </div>
            {login && <CopyButton value={login} />}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <dt className="text-xs text-muted">Temporary password</dt>
              <dd className="rounded bg-surface-2 px-2 py-1 font-mono text-base tracking-wide select-all">{tempPassword}</dd>
            </div>
            <CopyButton value={tempPassword} />
          </div>
        </dl>
        <CopyButton value={all} label="Copy all details" className="w-full justify-center py-2" />
        {note}
      </div>
    </Modal>
  );
}
