import type { Metadata } from "next";
import { LoginPageClient } from "@/components/site/account/login-page";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: true } };

export default function SignupPage() {
  return <LoginPageClient next="/" mode="signup" />;
}
