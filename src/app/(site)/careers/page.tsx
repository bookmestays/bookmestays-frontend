import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";

export const metadata: Metadata = { title: "Careers", alternates: { canonical: "/careers" } };

export default function CareersPage() {
  return (
    <StaticPage
      title="Careers at BookMeStays"
      subtitle="Help travellers find their perfect stay."
      sections={[
        { title: "Work with us", body: <p>We&apos;re a small team building a simpler, more visual way to book stays in India. We look for people who care about craft, honesty and hospitality.</p> },
        { title: "Open roles", body: <p>We don&apos;t have open roles listed right now, but we&apos;re always happy to hear from great people. Write to <a href="mailto:careers@bookmestays.com">careers@bookmestays.com</a> with a short note about yourself.</p> },
      ]}
    />
  );
}
