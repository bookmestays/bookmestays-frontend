"use client";

import { useState, type ReactNode } from "react";
import { Button, Field, Modal, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/use-api";

/**
 * Confirmation modal. When `notes` is set a textarea is shown and its value is passed to onConfirm.
 * onConfirm may throw; the error is shown inline and the dialog stays open.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  notes,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  notes?: { label: string; required?: boolean; placeholder?: string; defaultValue?: string };
  onConfirm: (notes: string) => Promise<unknown> | unknown;
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {open && <ConfirmBody {...{ onClose, description, confirmLabel, tone, notes, onConfirm, children }} />}
    </Modal>
  );
}

function ConfirmBody({
  onClose,
  description,
  confirmLabel,
  tone,
  notes,
  onConfirm,
  children,
}: {
  onClose: () => void;
  description?: ReactNode;
  confirmLabel: string;
  tone: "primary" | "danger";
  notes?: { label: string; required?: boolean; placeholder?: string; defaultValue?: string };
  onConfirm: (notes: string) => Promise<unknown> | unknown;
  children?: ReactNode;
}) {
  const [value, setValue] = useState(notes?.defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = !!notes?.required && !value.trim();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (missing) {
          setError(`${notes?.label} is required`);
          return;
        }
        setBusy(true);
        setError(null);
        try {
          await onConfirm(value.trim());
          onClose();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      {description && <div className="text-sm text-ink-2">{description}</div>}
      {children}
      {notes && (
        <Field label={notes.label} required={notes.required}>
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={notes.placeholder} rows={3} autoFocus />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
