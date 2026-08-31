import Link from "next/link";
import { getLiveDataStatus } from "@/lib/db";
import { canonicalUrl, formatSyncDate } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datakälla och uppdateringar",
  description:
    "Se hur Högskolekompassen använder Susa-navet, liveutbildningar, intern matchningslogik och aktuell datauppdatering.",
  alternates: { canonical: canonicalUrl("/datakalla") },
};

export default async function DataSourcePage() {
  const status = await getLiveDataStatus();

  return (
    <main className="infoPage">
      <section className="shell infoHero">
        <span className="eyebrow">Datakälla</span>
        <h1>Liveutbildningar först, matchningslogik bakom.</h1>
        <p className="lead">
          Högskolekompassen visar aktuella utbildningar från Susa-navet och använder intern matchningslogik för att
          förklara varför vissa alternativ passar bättre än andra.
        </p>
      </section>

      <section className="shell infoSection">
        <div className="dataSourceGrid">
          <article className="dataSourcePanel">
            <span className="eyebrow">1. Livekatalog</span>
            <h2>{status.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} utbildningar` : "Inväntar livesynk"}</h2>
            <p>
              Utbildningslistan hämtas från Susa-navet för universitet och högskola när produktionssynken körs.
              Senaste registrerade uppdatering: <strong>{formatSyncDate(status.lastSync?.value)}</strong>.
            </p>
          </article>
          <article className="dataSourcePanel">
            <span className="eyebrow">2. Matchningslogik</span>
            <h2>Adaptiv profil</h2>
            <p>
              Frågorna bygger en profil för intressen, studiestil, arbetssätt och framtidsmål. Utbildningar poängsätts
              direkt mot livedatan och får extra stöd av interna ämnessignaler när sådana finns.
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
          <Link className="button" href="/utbildningar">Öppna utbildningar</Link>
          <Link className="button buttonGhost" href="/datakvalitet">Se datakvalitet</Link>
        </div>
      </section>
    </main>
  );
}
