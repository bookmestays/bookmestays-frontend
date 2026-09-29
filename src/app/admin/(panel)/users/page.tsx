"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { Paginated, User } from "@/lib/types";
import type { AdminUserRow } from "@/lib/panel-types";
import { Badge, Button, Field, Input, Modal, useToast } from "@/components/ui";
import { CopyButton, PageHeader } from "@/components/panel/page";
import { DataTable, useUrlPagination } from "@/components/panel/data-table";
import { FiltersBar, SearchFilter, UrlTabs } from "@/components/panel/filters";
import { useUrlParams } from "@/components/panel/url-state";
import { usePanelAuth } from "@/components/panel/auth";
import { ROLE_LABELS } from "@/components/panel/labels";
import { EMAIL_RE } from "@/components/panel/util";
import { passwordProblems } from "@/components/panel/auth-forms";

const TAB_ROLES: Record<string, string | string[]> = {
  customers: "CUSTOMER",
  staff: ["SUPER_ADMIN", "ADMIN_STAFF"],
  partners: ["PARTNER_OWNER", "PARTNER_STAFF"],
};

export default function UsersPage() {
  const toast = useToast();
  const { isSuperAdmin, me } = usePanelAuth();
  const { get, query } = useUrlParams();
  const tab = get("tab") || "customers";
  const { tab: _t, ...rest } = query;
  void _t;
  const { data, error, loading, refetch } = useApi<Paginated<AdminUserRow>>("/admin/users", { limit: 20, ...rest, role: TAB_ROLES[tab] ?? "CUSTOMER" });
  const pagination = useUrlPagination(data);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (u: AdminUserRow) => {
    setBusyId(u.id);
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
      toast.success(u.isActive ? "User deactivated" : "User activated");
      refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Guests, partner logins and BookMeStays staff."
        actions={
          isSuperAdmin && (
            <Button onClick={() => setCreating(true)}>
              <UserPlus className="size-4" /> New staff member
            </Button>
          )
        }
      />
      <UrlTabs
        tabs={[
          { value: "customers", label: "Customers" },
          { value: "partners", label: "Partner users" },
          { value: "staff", label: "Admin staff" },
        ]}
      />
      <FiltersBar>
        <SearchFilter placeholder="Name, email or phone…" />
      </FiltersBar>
      <DataTable<AdminUserRow>
        rows={data?.items}
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        pagination={pagination}
        columns={[
          {
            key: "name",
            header: "User",
            cell: (u) => (
              <div>
                <p className="font-medium text-ink">{u.name ?? "—"}</p>
                <p className="text-xs text-muted">{[u.email, u.phone].filter(Boolean).join(" · ")}</p>
              </div>
            ),
            sortValue: (u) => u.name,
          },
          { key: "role", header: "Role", cell: (u) => <Badge tone={u.role === "SUPER_ADMIN" ? "brand" : "neutral"}>{ROLE_LABELS[u.role]}</Badge> },
          { key: "partner", header: "Partner", cell: (u) => u.partnerName ?? "—", hideBelow: "md" },
          { key: "created", header: "Joined", cell: (u) => formatDate(u.createdAt), sortValue: (u) => u.createdAt, hideBelow: "sm" },
          { key: "status", header: "Status", cell: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Inactive</Badge>) },
          {
            key: "act",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (u) =>
              u.id !== me.user.id && (u.role !== "SUPER_ADMIN" || isSuperAdmin) ? (
                <Button size="sm" variant="ghost" loading={busyId === u.id} onClick={() => toggle(u)}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </Button>
              ) : null,
          },
        ]}
        empty={{ title: "No users found" }}
      />
      <Modal open={creating} onClose={() => setCreating(false)} title="New admin staff member">
        {creating && (
          <StaffForm
            onClose={() => setCreating(false)}
            onDone={() => {
              refetch();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function StaffForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);
  const pw = f.password ? passwordProblems(f.password) : [];
  const errs = { name: f.name.trim().length < 2 ? "Name is required" : null, email: !EMAIL_RE.test(f.email.trim()) ? "Valid email required" : null, password: pw.length ? `Use ${pw.join(" and ")}` : null };

  if (temp)
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-2">Staff account created. Share this temporary password securely — it&apos;s shown only once.</p>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <span className="font-mono">{temp}</span>
          <CopyButton value={temp} />
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
        if (errs.name || errs.email || errs.password) return;
        setBusy(true);
        try {
          const res = await api<{ user: User; tempPassword?: string }>("/admin/users", {
            method: "POST",
            body: { name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim() || undefined, role: "ADMIN_STAFF", password: f.password || undefined },
          });
          toast.success("Staff member created");
          onDone();
          if (res.tempPassword) setTemp(res.tempPassword);
          else onClose();
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
      <Field label="Email" required error={touched ? errs.email : null}>
        <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Phone">
        <Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <Field label="Initial password" hint="Leave empty to generate a temporary password" error={touched ? errs.password : null}>
        <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Create staff
        </Button>
      </div>
    </form>
  );
}
