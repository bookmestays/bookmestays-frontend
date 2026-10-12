import type { Metadata } from "next";
import { RegisterForm } from "@/components/panel/auth-forms";

export const metadata: Metadata = { title: "List your property" };

export default function PartnerRegisterPage() {
  return <RegisterForm />;
}
