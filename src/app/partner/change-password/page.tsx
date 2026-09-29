import type { Metadata } from "next";
import { ChangePasswordScreen } from "../_components/change-password-screen";

export const metadata: Metadata = { title: "Change password" };

export default function PartnerChangePasswordPage() {
  return <ChangePasswordScreen />;
}
