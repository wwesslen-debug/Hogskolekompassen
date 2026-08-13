import Link from "next/link";
import ProgramBrowser from "@/components/ProgramBrowser";
import { getFilterOptions, getLiveDataStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ProgramsPage() {
  const options = getFilterOptions();
  const liveStatus = getLiveDataStatus();

  return (
    <main className="browserPage">
      <section className="shell browserHeader">
        <span className="eyebrow">Matchningskatalog</span>
        <h1>Utforska utbildningstyper</h1>
        <p className="lead">
          Här finns Högskolekompassens profiler för hundratals utbildningsinriktningar. De används för att förklara
          studiestil, karriärspår och personlig matchning. I v0.7 ligger det verkliga terminsutbudet separat och
          synkas från Susa-navet, så en matchningsprofil kan kopplas till flera riktiga utbildningstillfällen.
        </p>
        <div className="catalogModeActions">
          <Link href="/aktuellt" className="button buttonGhost">
            Se aktuellt utbud {liveStatus.eventCount ? `· ${liveStatus.eventCount} tillfällen` : "· synka Susa-navet"} →
          </Link>
          <Link href="/kompass" className="textButton">Gör kompassen</Link>
        </div>
      </section>

      <section className="shell browserSection">
        <ProgramBrowser options={options} />
      </section>
    </main>
  );
}
