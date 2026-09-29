import type { Metadata } from "next";
import { LoginPageClient } from "@/components/site/account/login-page";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return <LoginPageClient next={next} mode={sp.mode === "signup" ? "signup" : "otp"} />;
}
