import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("hitta-utbildning");

export const metadata = getSeoGuideMetadata(guide);

export default function FindEducationPage() {
  return <SeoGuidePage guide={guide} />;
}
