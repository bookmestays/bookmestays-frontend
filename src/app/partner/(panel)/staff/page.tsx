"use client";

import { useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { User } from "@/lib/types";
import type { PartnerStaffUser } from "@/lib/panel-types";
import { Badge, Button, Checkbox, Field, Input, Modal, useToast } from "@/components/ui";
import { CopyButton, PageHeader } from "@/components/panel/page";
import { DataTable } from "@/components/panel/data-table";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { Toggle } from "@/components/panel/inputs";
import { PERMISSIONS, ROLE_LABELS } from "@/components/panel/labels";
import { EMAIL_RE, asList } from "@/components/panel/util";
import { RequirePermission } from "../../_components/require";

export default function StaffPage() {
  return (
    <RequirePermission perm="owner">
      <Staff />
    </RequirePermission>
  );
}

function Staff() {
  const toast = useToast();
  const { data, error, loading, refetch } = useApi<PartnerStaffUser[] | { items: PartnerStaffUser[] }>("/partner/staff");
  const [editing, setEditing] = useState<PartnerStaffUser | "new" | null>(null);
  const [removing, setRemoving] = useState<PartnerStaffUser | null>(null);
  return (
    <>
      <PageHeader
        title="Staff"
        description="Give your team their own logins with only the access they need."
        actions={
          <Button onClick={() => setEditing("new")}>
            <UserPlus className="size-4" /> Add staff
          </Button>
        }
      />
      <DataTable<PartnerStaffUser>
        rows={data ? asList(data) : undefined}
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (u) => (
              <div>
                <p className="font-medium text-ink">{u.name ?? "—"}</p>
                <p className="text-xs text-muted">{[u.email, u.phone].filter(Boolean).join(" · ")}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", cell: (u) => <Badge tone={u.role === "PARTNER_OWNER" ? "brand" : "neutral"}>{ROLE_LABELS[u.role]}</Badge> },
          {
            key: "perms",
            header: "Access",
            cell: (u) =>
              u.role === "PARTNER_OWNER" ? (
                <span className="text-xs text-muted">Everything</span>
              ) : (
                <div className="flex flex-wrap gap-1">{u.permissions.map((p) => <Badge key={p}>{PERMISSIONS.find((x) => x.value === p)?.label ?? p}</Badge>)}</div>
              ),
            hideBelow: "sm",
          },
          { key: "status", header: "Status", cell: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge>Disabled</Badge>) },
          {
            key: "act",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (u) =>
              u.role === "PARTNER_OWNER" ? null : (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Remove ${u.name}`} className="hover:text-danger" onClick={() => setRemoving(u)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
          },
        ]}
        empty={{ title: "No staff yet" }}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add staff member" : "Edit staff member"}>
        {editing && <StaffForm user={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={refetch} />}
      </Modal>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? "staff member"}?`}
        description="They will no longer be able to sign in to the partner panel."
        tone="danger"
        confirmLabel="Remove"
        onConfirm={async () => {
          await api(`/partner/staff/${removing?.id}`, { method: "DELETE" });
          toast.success("Staff member removed");
          refetch();
        }}
      />
    </>
  );
}

function StaffForm({ user, onClose, onSaved }: { user: PartnerStaffUser | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", permissions: user?.permissions ?? ["bookings"], isActive: user?.isActive ?? true });
  const [temp, setTemp] = useState<{ login: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const errs = {
    name: f.name.trim().length < 2 ? "Name is required" : null,
    email: !EMAIL_RE.test(f.email.trim()) ? "Valid email required" : null,
    permissions: !f.permissions.length ? "Choose at least one area" : null,
  };
  if (temp)
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-ink">Share these details with your staff member — the temporary password is shown only once. They&apos;ll set their own password at first login.</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>
              Login: <strong>{temp.login}</strong>
            </span>
            <CopyButton value={temp.login} />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <span className="font-mono text-base">{temp.password}</span>
            <CopyButton value={temp.password} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (errs.name || (!user && errs.email) || errs.permissions) return;
        setBusy(true);
        try {
          if (user) {
            await api(`/partner/staff/${user.id}`, { method: "PATCH", body: { name: f.name.trim(), phone: f.phone.trim() || null, permissions: f.permissions, isActive: f.isActive } });
            toast.success("Staff member updated");
            onSaved();
            onClose();
          } else {
            const res = await api<{ user: User; tempPassword: string }>("/partner/staff", { method: "POST", body: { name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim() || undefined, permissions: f.permissions } });
            toast.success("Staff member added");
            onSaved();
            setTemp({ login: res.user.email ?? f.email, password: res.tempPassword });
          }
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Name" required error={touched ? errs.name : null}>
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Email" required={!user} error={touched && !user ? errs.email : null} hint={user ? "Email can't be changed" : "They sign in with this email"}>
        <Input type="email" value={f.email} disabled={!!user} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Phone">
        <Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Access</legend>
        <div className="space-y-2">
          {PERMISSIONS.map((p) => (
            <Checkbox
              key={p.value}
              checked={f.permissions.includes(p.value)}
              onChange={(e) => setF({ ...f, permissions: e.target.checked ? [...f.permissions, p.value] : f.permissions.filter((x) => x !== p.value) })}
              label={
                <span>
                  {p.label} <span className="text-xs text-muted">— {p.hint}</span>
                </span>
              }
            />
          ))}
        </div>
        {touched && errs.permissions && <p className="mt-1 text-xs text-danger">{errs.permissions}</p>}
      </fieldset>
      {user && <Toggle label="Active" description="Disabled staff can't sign in" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {user ? "Save" : "Add staff"}
        </Button>
      </div>
    </form>
  );
}
