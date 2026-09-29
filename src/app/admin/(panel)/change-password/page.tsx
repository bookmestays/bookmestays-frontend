"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { PageHeader, Section } from "@/components/panel/page";
import { ChangePasswordForm } from "@/components/panel/auth-forms";

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <PageHeader title="Change password" />
      <Section className="max-w-md">
        <ChangePasswordForm
          onDone={() => {
            toast.success("Password updated");
            router.push("/admin");
          }}
        />
      </Section>
    </>
  );
}
