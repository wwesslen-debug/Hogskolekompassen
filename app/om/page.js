import Link from "next/link";
import { getLiveDataStatus, getProgramCount } from "@/lib/db";
import { canonicalUrl, formatSyncDate } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Om Högskolekompassen",
  description:
    "Högskolekompassen är en oberoende public beta som hjälper dig förstå din utbildningsprofil och hitta vägar vidare till officiell information.",
  alternates: { canonical: canonicalUrl("/om") },
};

export default async function AboutPage() {
  const programCount = getProgramCount();
  const liveStatus = await getLiveDataStatus();

  return (
    <main className="infoPage">
      <section className="shell infoHero">
        <span className="eyebrow">Om tjänsten</span>
        <h1>En kompass för utbildningsval, inte en facitmaskin.</h1>
        <p className="lead">
          Högskolekompassen hjälper dig ringa in intressen, studiestil och drivkrafter. Resultatet ska göra nästa steg
          tydligare: vilka utbildningar du bör läsa mer om, jämföra och kontrollera hos officiella källor.
        </p>
      </section>

      <section className="shell infoSection">
        <div className="infoGrid">
          <article className="infoCard">
            <span className="statusDot" />
            <h2>Public beta</h2>
            <p>
              Tjänsten är öppen för testning inför lansering. Matchningen kan redan användas som vägledning, men
              antagningskrav, kursinnehåll, studieorter och datum ska alltid verifieras hos lärosäte och Antagning.se.
            </p>
          </article>
          <article className="infoCard">
            <span className="statusDot" />
            <h2>Oberoende</h2>
            <p>
              Högskolekompassen är inte ansluten till UHR, Antagning.se, Skolverket eller något lärosäte. Länkar vidare
              till officiella källor finns för att du ska kunna kontrollera informationen själv.
            </p>
          </article>
          <article className="infoCard">
            <span className="statusDot" />
            <h2>Transparent modell</h2>
            <p>
              Resultatet visar delpoäng och förklaringar, inte bara en rekommendation. Procenten är en profilmatchning,
              inte en prognos för antagning, examen eller framtida trivsel.
            </p>
          </article>
        </div>

        <div className="launchChecklist">
          <div>
            <span className="eyebrow">Launch-status</span>
            <h2>Vad är redo just nu?</h2>
          </div>
          <ul>
            <li><strong>Kompassflöde:</strong> 50 grundfrågor, adaptiva följdfrågor och personliga prioriteringar.</li>
            <li><strong>Matchningskatalog:</strong> {programCount.toLocaleString("sv-SE")} utbildningsprofiler med stabila detaljsidor.</li>
            <li><strong>Livekatalog:</strong> {liveStatus.eventCount ? `${liveStatus.eventCount.toLocaleString("sv-SE")} synkade utbildningstillfällen` : "redo för Susa-synk när produktionsdatan aktiveras"}.</li>
            <li><strong>Senaste datauppdatering:</strong> {formatSyncDate(liveStatus.lastSync?.value)}.</li>
          </ul>
        </div>

        <div className="infoActions">
          <Link className="button" href="/kompass">Starta kompassen</Link>
          <Link className="button buttonGhost" href="/datakalla">Se datakälla och status</Link>
        </div>
      </section>
    </main>
  );
}
