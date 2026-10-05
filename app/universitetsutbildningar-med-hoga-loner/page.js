import SeoGuidePage from "@/components/SeoGuidePage";
import { getSeoGuideBySlug, getSeoGuideMetadata } from "@/lib/seo-landings";

const guide = getSeoGuideBySlug("universitetsutbildningar-med-hoga-loner");

export const metadata = getSeoGuideMetadata(guide);

export default function HighSalaryEducationsPage() {
  return <SeoGuidePage guide={guide} />;
}
