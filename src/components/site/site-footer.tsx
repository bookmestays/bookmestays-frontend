import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { SiteMeta } from "@/lib/types";
import { Logo } from "./primitives";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "BookMeStays",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
      { href: "/partner-with-us", label: "Partner With Us" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/hotels", label: "Hotels" },
      { href: "/villas", label: "Villas" },
      { href: "/farmhouses", label: "Farmhouses" },
      { href: "/homestays", label: "Homestays" },
      { href: "/heritage-stays", label: "Heritage Stays" },
      { href: "/experiences", label: "Experiences" },
    ],
  },
  {
    title: "Travel",
    links: [
      { href: "/travel/couples", label: "Couples" },
      { href: "/travel/family", label: "Families" },
      { href: "/travel/friends", label: "Friends" },
      { href: "/travel/corporate", label: "Corporate" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/cancellation-policy", label: "Cancellation Policy" },
      { href: "/help#booking-support", label: "Booking Support" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

// lucide v1 has no brand icons — tiny inline marks.
const SOCIAL_ICONS: Record<string, string> = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4 1.3-.1 1.6-.1 4.8-.1zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.1 1.1 0 1 0 0 2.3 1.1 1.1 0 0 0 0-2.3z",
  facebook: "M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4v3.2h2.8V22h3.3z",
  twitter: "M17.8 3h3.1l-6.7 7.7L22 21h-6.2l-4.8-6.3L5.4 21H2.3l7.2-8.2L2 3h6.3l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z",
  x: "M17.8 3h3.1l-6.7 7.7L22 21h-6.2l-4.8-6.3L5.4 21H2.3l7.2-8.2L2 3h6.3l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z",
  youtube:
    "M23 7.2s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.3-1C16.6 3.6 12 3.6 12 3.6s-4.6 0-7.8.3c-.4.1-1.4.1-2.3 1-.7.7-.9 2.3-.9 2.3S.8 9.1.8 11v1.8c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.6.2 7.6.2s4.6 0 7.8-.3c.4-.1 1.4-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8V11c0-1.9-.2-3.8-.2-3.8zM9.7 15V8.4l6.1 3.3L9.7 15z",
  linkedin:
    "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z",
};

export function SiteFooter({ support }: { support: SiteMeta["support"] }) {
  const social = Object.entries(support.social ?? {}).filter(([, url]) => !!url);
  return (
    <footer className="mt-auto bg-surface-3 text-white/75">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo tone="light" showTagline href="/" />
            <p className="mt-3 text-sm">See the property on video before you book it — hotels, villas, farmhouses, homestays and heritage stays across India.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {support.phone && (
                <li>
                  <a href={`tel:${support.phone}`} className="inline-flex items-center gap-2 hover:text-white">
                    <Phone className="size-4" aria-hidden /> {support.phone}
                  </a>
                </li>
              )}
              {support.email && (
                <li>
                  <a href={`mailto:${support.email}`} className="inline-flex items-center gap-2 hover:text-white">
                    <Mail className="size-4" aria-hidden /> {support.email}
                  </a>
                </li>
              )}
              {support.whatsapp && (
                <li>
                  <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <MessageCircle className="size-4" aria-hidden /> WhatsApp us
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="text-sm font-semibold text-white">{col.title}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="hover:text-white hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BookMeStays. All rights reserved. Prices shown in INR and include applicable taxes at checkout.</p>
          {social.length > 0 && (
            <ul className="flex items-center gap-3" aria-label="Social media">
              {social.map(([name, url]) => (
                <li key={name}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`BookMeStays on ${name}`}
                    className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    {SOCIAL_ICONS[name.toLowerCase()] ? (
                      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                        <path d={SOCIAL_ICONS[name.toLowerCase()]} />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold uppercase">{name.charAt(0)}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
