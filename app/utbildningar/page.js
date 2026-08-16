import Link from "next/link";
import ProgramBrowser from "@/components/ProgramBrowser";
import { getFilterOptions, getLiveDataStatus } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";
import { getAdSenseConfig } from "@/lib/ads";
import AdSenseUnit from "@/components/AdSenseUnit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Utbildningar",
  description:
    "Utforska Högskolekompassens utbildningsprofiler, jämför studieprofil och gå vidare till officiell information.",
  alternates: { canonical: canonicalUrl("/utbildningar") },
};

export default async function ProgramsPage() {
  const options = getFilterOptions();
  const liveStatus = await getLiveDataStatus();
  const catalogAd = getAdSenseConfig("catalogInline");

  return (
    <main className="browserPage">
      <section className="shell browserHeader">
        <span className="eyebrow">Matchningskatalog</span>
        <h1>Utforska utbildningstyper</h1>
        <p className="lead">
          Här finns Högskolekompassens profiler för hundratals utbildningsinriktningar. De används för att förklara
          studiestil, karriärspår och personlig matchning. Det verkliga terminsutbudet ligger separat och synkas från
          Susa-navet när produktionsdatan är aktiverad, så en matchningsprofil kan kopplas till flera riktiga
          utbildningstillfällen.
        </p>
        <div className="catalogModeActions">
          <Link href="/aktuellt" className="button buttonGhost">
            Se aktuellt utbud {liveStatus.eventCount ? `· ${liveStatus.eventCount} tillfällen` : "· synka Susa-navet"} →
          </Link>
          <Link href="/kompass" className="textButton">Gör kompassen</Link>
        </div>
      </section>

      <AdSenseUnit
        {...catalogAd}
        className="shell manualAdInline manualAdBetweenSections"
        label="Annons i utbildningskatalog"
        format="horizontal"
      />

      <section className="shell browserSection">
        <ProgramBrowser options={options} />
      </section>
    </main>
  );
}
