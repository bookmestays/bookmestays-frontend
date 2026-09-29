"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/use-api";
import type { CommissionType } from "@/lib/types";
import { Button, Checkbox, Field, Modal, useToast } from "@/components/ui";
import { CommissionInput } from "@/components/panel/inputs";
import { commissionLabel } from "@/components/panel/labels";
import { formatINR } from "@/lib/format";

export type ReviewableRoomType = { id: string; name: string; propertyName?: string | null; basePrice?: number; totalRooms?: number };

/** Approve (optionally with a room-type commission rule) or reject a partner's new room type. */
export function RoomTypeReviewDialog({
  roomType,
  onClose,
  onDone,
  partnerDefault,
}: {
  roomType: ReviewableRoomType | null;
  onClose: () => void;
  onDone: () => void;
  partnerDefault?: { type: CommissionType; value: number } | null;
}) {
  return (
    <Modal open={!!roomType} onClose={onClose} title="Review room type">
      {roomType && <Body rt={roomType} onClose={onClose} onDone={onDone} partnerDefault={partnerDefault} />}
    </Modal>
  );
}

function Body({ rt, onClose, onDone, partnerDefault }: { rt: ReviewableRoomType; onClose: () => void; onDone: () => void; partnerDefault?: { type: CommissionType; value: number } | null }) {
  const toast = useToast();
  const [custom, setCustom] = useState(false);
  const [type, setType] = useState<CommissionType>(partnerDefault?.type ?? "PERCENT");
  const [value, setValue] = useState<number | null>(partnerDefault?.value ?? null);
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const invalid = custom && (value == null || (type === "PERCENT" && value > 10000));

  const submit = async (action: "APPROVE" | "REJECT") => {
    if (action === "APPROVE" && invalid) return;
    setBusy(action);
    try {
      await api(`/admin/room-types/${rt.id}/review`, {
        method: "POST",
        body: { action, ...(action === "APPROVE" && custom && value != null ? { commission: { type, value } } : {}) },
      });
      toast.success(action === "APPROVE" ? `${rt.name} approved` : `${rt.name} rejected`);
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <p className="font-medium text-ink">{rt.name}</p>
        <p className="text-xs text-muted">
          {[rt.propertyName, rt.totalRooms != null && `${rt.totalRooms} rooms`, rt.basePrice != null && `from ${formatINR(rt.basePrice)}/night`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Checkbox
        checked={custom}
        onChange={(e) => setCustom(e.target.checked)}
        label={
          <span>
            Set a commission for this room type
            {partnerDefault && <span className="block text-xs text-muted">Otherwise the property/partner rule applies (default {commissionLabel(partnerDefault.type, partnerDefault.value)}).</span>}
          </span>
        }
      />
      {custom && (
        <Field label="Room-type commission" error={invalid ? "Enter a valid commission (max 100%)" : null}>
          <CommissionInput
            type={type}
            value={value}
            invalid={invalid}
            onChange={(v) => {
              setType(v.type);
              setValue(v.value);
            }}
          />
        </Field>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose} disabled={!!busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => submit("REJECT")} loading={busy === "REJECT"} disabled={!!busy}>
          Reject
        </Button>
        <Button onClick={() => submit("APPROVE")} loading={busy === "APPROVE"} disabled={!!busy || invalid}>
          Approve
        </Button>
      </div>
    </div>
  );
}
