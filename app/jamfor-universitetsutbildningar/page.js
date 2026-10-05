import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("jamfor-universitetsutbildningar");

export const metadata = getSeoGuideMetadata(guide);

export default function CompareUniversityEducationsPage() {
  return <SeoGuidePage guide={guide} />;
}
