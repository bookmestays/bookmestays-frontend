"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "../auth-context";

export function ProfileForm() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  if (!user) return null;
  const nameValue = name ?? user.name ?? "";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (nameValue.trim().length < 2) return toast.error("Please enter your name.");
    setBusy(true);
    try {
      const res = await api<{ user: User }>("/auth/me", { method: "PATCH", body: { name: nameValue.trim() } });
      updateUser(res.user);
      setName(null);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pw.next.length < 8) return setPwError("New password must be at least 8 characters.");
    setPwBusy(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword: pw.current || undefined, newPassword: pw.next } });
      setPw({ current: "", next: "" });
      toast.success("Password updated");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Couldn't update your password.");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>
      <Card className="p-5">
        <form onSubmit={save} className="grid max-w-xl gap-4">
          <Field label="Full name">
            <Input autoComplete="name" value={nameValue} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Contact support to change your email.">
            <Input value={user.email ?? "—"} disabled />
          </Field>
          <Field label="Mobile number">
            <Input value={user.phone ?? "—"} disabled />
          </Field>
          <div>
            <Button type="submit" loading={busy} disabled={name === null}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink">Password</h2>
        <p className="mt-1 text-sm text-muted">Optional — you can always sign in with a one-time code instead.</p>
        <form onSubmit={changePassword} className="mt-4 grid max-w-xl gap-4">
          <Field label="Current password" hint="Leave blank if you've never set one.">
            <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="New password" error={pwError}>
            <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <div>
            <Button type="submit" variant="outline" loading={pwBusy}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
      <Button variant="ghost" className="text-danger" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}
