import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("utbildningar-utan-matte-3");

export const metadata = getSeoGuideMetadata(guide);

export default function EducationsWithoutMath3Page() {
  return <SeoGuidePage guide={guide} />;
}
