import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("vilken-utbildning-passar-mig");

export const metadata = getSeoGuideMetadata(guide);

export default function WhichEducationFitsMePage() {
  return <SeoGuidePage guide={guide} />;
}
