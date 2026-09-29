"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/use-api";
import type { Paginated } from "@/lib/types";
import { Button, Modal, useToast } from "@/components/ui";
import { ConfirmDialog } from "@/components/panel/confirm-dialog";
import { DataTable, type Column } from "@/components/panel/data-table";
import { PageHeader, type Crumb } from "@/components/panel/page";
import { asList } from "@/components/panel/util";

export type CrudFormProps<T> = { item: T | null; onCancel: () => void; onSaved: () => void };

/**
 * Generic admin list + create/edit modal + delete confirm for simple CMS collections.
 * Endpoint conventions: GET path (array or Paginated), POST path, PATCH/DELETE path/:id.
 */
export function CrudPage<T extends { id: string }>({
  path,
  query,
  title,
  description,
  breadcrumbs,
  noun,
  columns,
  Form,
  filters,
  modalSize = "lg",
  canDelete = true,
  deleteWarning,
  paginated,
  onPage,
}: {
  path: string;
  query?: Record<string, string | number | undefined | string[]>;
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  noun: string;
  columns: Column<T>[];
  Form: (p: CrudFormProps<T>) => ReactNode;
  filters?: ReactNode;
  modalSize?: "md" | "lg" | "xl";
  canDelete?: boolean;
  deleteWarning?: string;
  paginated?: boolean;
  onPage?: (p: number) => void;
}) {
  const toast = useToast();
  const { data, error, loading, refetch } = useApi<T[] | Paginated<T>>(path, query);
  const rows = data ? asList(data) : undefined;
  const pg = data && !Array.isArray(data) && paginated && onPage ? { page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit, onPageChange: onPage } : undefined;
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const actionCol: Column<T> = {
    key: "_actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    cell: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" aria-label={`Edit ${noun}`} onClick={() => setEditing(r)}>
          <Pencil className="size-4" />
        </Button>
        {canDelete && (
          <Button size="sm" variant="ghost" aria-label={`Delete ${noun}`} className="hover:text-danger" onClick={() => setDeleting(r)}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    ),
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New {noun}
          </Button>
        }
      />
      {filters}
      <DataTable
        columns={[...columns, actionCol]}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        onRowClick={(r) => setEditing(r)}
        pagination={pg}
        empty={{ title: `No ${noun}s yet`, action: <Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus className="size-4" /> New {noun}</Button> }}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? `New ${noun}` : `Edit ${noun}`} size={modalSize}>
        {editing && (
          <Form
            item={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              refetch();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${noun}?`}
        description={deleteWarning ?? "This can't be undone."}
        tone="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          await api(`${path}/${deleting?.id}`, { method: "DELETE" });
          toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
          refetch();
        }}
      />
    </>
  );
}

/** Save helper for CRUD forms: POST when new, PATCH when editing. */
export function useCrudSave(path: string, id: string | undefined, onSaved: () => void, successMsg = "Saved") {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (body: unknown) => {
    setBusy(true);
    try {
      const res = await api<{ id: string }>(id ? `${path}/${id}` : path, { method: id ? "PATCH" : "POST", body });
      toast.success(successMsg);
      onSaved();
      return res;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, save };
}

export function FormActions({ busy, onCancel, label = "Save" }: { busy: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-line pt-4">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={busy}>
        {label}
      </Button>
    </div>
  );
}
