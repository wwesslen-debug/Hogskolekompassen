import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("vad-ska-jag-plugga");

export const metadata = getSeoGuideMetadata(guide);

export default function WhatShouldIStudyPage() {
  return <SeoGuidePage guide={guide} />;
}
