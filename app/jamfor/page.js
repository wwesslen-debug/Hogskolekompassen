import ComparePage from "@/components/ComparePage";
import { canonicalUrl } from "@/lib/site";

export const metadata = {
  title: "Jämför utbildningar",
  description:
    "Jämför upp till tre utbildningar sida vid sida och se hur de skiljer sig i studieprofil, matchning och innehåll.",
  alternates: { canonical: canonicalUrl("/jamfor") },
};

export default function CompareRoute() {
  return <ComparePage />;
}
