import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/panel/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm portal="admin" />
    </Suspense>
  );
}
