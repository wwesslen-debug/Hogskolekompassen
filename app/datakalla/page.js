import Link from "next/link";
import { getLiveDataStatus, getProgramCount } from "@/lib/db";
import { canonicalUrl, formatSyncDate } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datakälla och uppdateringar",
  description:
    "Se hur Högskolekompassen använder matchningsprofiler, Susa-navet, länkning till Antagning.se och aktuell datauppdatering.",
  alternates: { canonical: canonicalUrl("/datakalla") },
};

export default async function DataSourcePage() {
  const programCount = getProgramCount();
  const status = await getLiveDataStatus();

  return (
    <main className="infoPage">
      <section className="shell infoHero">
        <span className="eyebrow">Datakälla</span>
        <h1>Två datalager, tydligt separerade.</h1>
        <p className="lead">
          Högskolekompassen skiljer på matchningsprofiler och aktuella utbildningstillfällen. Det gör att du kan förstå
          varför något passar dig och samtidigt gå vidare till officiell information.
        </p>
      </section>

      <section className="shell infoSection">
        <div className="dataSourceGrid">
          <article className="dataSourcePanel">
            <span className="eyebrow">1. Matchningsprofiler</span>
            <h2>{programCount.toLocaleString("sv-SE")} profiler</h2>
            <p>
              Profilerna beskriver utbildningsinriktningar och används för själva kompassen: intresse, studiestil,
              arbetssätt och framtidsmål. De är vägledande och ska inte läsas som officiella kursplaner.
            </p>
          </article>
          <article className="dataSourcePanel">
            <span className="eyebrow">2. Aktuellt utbud</span>
            <h2>{status.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} tillfällen` : "Inväntar livesynk"}</h2>
            <p>
              Livekatalogen hämtas från Susa-navet för universitet och högskola när produktionssynken körs. Senaste
              registrerade uppdatering: <strong>{formatSyncDate(status.lastSync?.value)}</strong>.
            </p>
          </article>
          <article className="dataSourcePanel">
            <span className="eyebrow">3. Officiell kontroll</span>
            <h2>Antagning och lärosäten</h2>
            <p>
              Det sista steget ska alltid ske hos officiell källa. Där kontrollerar du behörighet, urval, startdatum,
              studieort, anmälningskod och eventuella ändringar.
            </p>
          </article>
        </div>

        <div className="dataNotice dataNoticeV2 publicNotice">
          <strong>Viktigt:</strong> Högskolekompassen ersätter inte Antagning.se eller lärosätenas egna sidor. Tjänsten
          hjälper dig hitta rimliga alternativ och förstå varför de dyker upp.
        </div>

        <div className="infoActions">
          <Link className="button" href="/aktuellt">Öppna aktuellt utbud</Link>
          <Link className="button buttonGhost" href="/datakvalitet">Se datakvalitet</Link>
        </div>
      </section>
    </main>
  );
}
