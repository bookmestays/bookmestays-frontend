import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { WhyBookMeStays } from "@/components/site/home/home-sections";

export const metadata: Metadata = { title: "About us", description: "BookMeStays helps you see the property before you book it — video-first stays across India.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <StaticPage
        title="About BookMeStays"
        subtitle="Your perfect stay. Simply Booked."
        sections={[
          { title: "Why we exist", body: <p>Booking a stay shouldn&apos;t feel like a gamble. Photos can be flattering and descriptions vague. BookMeStays is built around one simple idea: see the property before you book it — real video walkthroughs of rooms, pools, views and surroundings, alongside clear, honest information.</p> },
          { title: "What we offer", body: <p>A curated collection of hotels, villas, farmhouses, homestays and heritage stays across India, with local experiences you can pair with your stay. Every property is reviewed by our team before it goes live.</p> },
          { title: "How it works", body: <ul><li>Discover stays by city, type or travel style.</li><li>Watch the property on video and understand every room option.</li><li>Choose the room and rate that suits you — with taxes and cancellation terms shown upfront.</li><li>Book securely in a few taps and get instant confirmation.</li></ul> },
        ]}
      />
      <WhyBookMeStays tone="grey" />
    </>
  );
}
