"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { PartnerDetail } from "@/lib/types";
import { Badge, Button, useToast } from "@/components/ui";
import { DataTable } from "@/components/panel/data-table";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { PERMISSIONS, ROLE_LABELS } from "@/components/panel/labels";
import { CredentialsDialog } from "../../../_components/credentials-dialog";

type PUser = PartnerDetail["users"][number];

export function UsersTab({ partner, onChanged }: { partner: PartnerDetail; onChanged: () => void }) {
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const owner = partner.users.find((u) => u.role === "PARTNER_OWNER");

  const toggleActive = async (u: PUser) => {
    setToggling(u.id);
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
      toast.success(u.isActive ? "User deactivated" : "User activated");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">The owner manages staff logins from their panel. You can reset the owner&apos;s password here.</p>
        <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={!owner}>
          <KeyRound className="size-4" /> Reset owner password
        </Button>
      </div>
      <DataTable<PUser>
        rows={partner.users}
        rowKey={(u) => u.id}
        columns={[
          {
            key: "name",
            header: "User",
            cell: (u) => (
              <div>
                <p className="font-medium text-ink">{u.name ?? "—"}</p>
                <p className="text-xs text-muted">{u.email ?? u.phone}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", cell: (u) => <Badge tone={u.role === "PARTNER_OWNER" ? "brand" : "neutral"}>{ROLE_LABELS[u.role]}</Badge> },
          {
            key: "perms",
            header: "Permissions",
            cell: (u) =>
              u.role === "PARTNER_OWNER" ? (
                <span className="text-xs text-muted">Full access</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {u.permissions.length ? u.permissions.map((p) => <Badge key={p}>{PERMISSIONS.find((x) => x.value === p)?.label ?? p}</Badge>) : <span className="text-xs text-muted">None</span>}
                </div>
              ),
            hideBelow: "md",
          },
          { key: "active", header: "Status", cell: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (u) => (
              <Button size="sm" variant="ghost" loading={toggling === u.id} onClick={() => toggleActive(u)}>
                {u.isActive ? "Deactivate" : "Activate"}
              </Button>
            ),
          },
        ]}
        empty={{ title: "No users" }}
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset owner password?"
        description={`A new temporary password will be generated for ${owner?.email ?? "the owner"} and emailed to them. They'll have to change it at next login.`}
        confirmLabel="Reset password"
        tone="danger"
        onConfirm={async () => {
          const res = await api<{ tempPassword: string }>(`/admin/partners/${partner.id}/reset-password`, { method: "POST" });
          setTemp(res.tempPassword);
        }}
      />
      {temp && <CredentialsDialog open onClose={() => setTemp(null)} title="New temporary password" login={owner?.email} tempPassword={temp} />}
    </div>
  );
}
