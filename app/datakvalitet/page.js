import Link from "next/link";
import { getLiveDataStatus, getLiveLinkQuality } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datakvalitet",
  description:
    "Följ hur Högskolekompassen länkar aktuella utbildningstillfällen från Susa-navet till matchningsprofiler.",
  alternates: { canonical: canonicalUrl("/datakvalitet") },
};

function pct(part, total) {
  return total ? `${(part / total * 100).toFixed(1)}%` : "0%";
}

export default async function DataQualityPage() {
  const [status, quality] = await Promise.all([
    getLiveDataStatus(),
    getLiveLinkQuality(25),
  ]);

  return (
    <main className="qualityPage">
      <section className="shell browserHeader qualityHeader">
        <span className="eyebrow">Datakvalitet · Live Matching</span>
        <h1>Datakvalitet & länkning</h1>
        <p className="lead">
          Här går det att följa hur stor del av Susa-navets högskoleutbud som Högskolekompassen kan koppla till de egna
          matchningsprofilerna. En omatchad post ligger fortfarande kvar i livekatalogen – den saknar bara personlig profilmatchning.
        </p>
        <div className="qualityMetaRow">
          <span>Skolform: <strong>{status.schoolType || "HS"}</strong></span>
          <span>Senaste synk: <strong>{status.lastSync?.value ? new Date(status.lastSync.value).toLocaleString("sv-SE") : "saknas"}</strong></span>
          <Link href="/aktuellt" className="textButton">Öppna livekatalogen →</Link>
        </div>
      </section>

      <section className="shell qualitySection">
        <div className="qualityStatsGrid">
          <article><span>Live-tillfällen</span><strong>{quality.total.toLocaleString("sv-SE")}</strong><small>HS-poster i lokal databas</small></article>
          <article><span>Kopplade</span><strong>{quality.linked.toLocaleString("sv-SE")}</strong><small>{quality.linkRate}% av live-utbudet</small></article>
          <article><span>Hög länksäkerhet</span><strong>{quality.confidence.high.toLocaleString("sv-SE")}</strong><small>≥ 75% länkscore</small></article>
          <article><span>Omatchade</span><strong>{quality.unlinked.toLocaleString("sv-SE")}</strong><small>synliga, men utan profilkoppling</small></article>
        </div>

        <div className="qualityGrid">
          <article className="qualityCard">
            <div className="qualityCardHeader"><span className="eyebrow">Täckning</span><h2>Per utbildningstyp</h2></div>
            <div className="qualityTableWrap">
              <table className="qualityTable">
                <thead><tr><th>Typ</th><th>Totalt</th><th>Kopplade</th><th>Andel</th></tr></thead>
                <tbody>{quality.byKind.map((row) => (
                  <tr key={row.kind}><td>{row.kind}</td><td>{row.total.toLocaleString("sv-SE")}</td><td>{row.linked.toLocaleString("sv-SE")}</td><td><strong>{pct(row.linked, row.total)}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>
          </article>

          <article className="qualityCard">
            <div className="qualityCardHeader"><span className="eyebrow">Metod</span><h2>Hur länkarna hittades</h2></div>
            <div className="methodList">
              {quality.methods.length ? quality.methods.map((row) => (
                <div key={row.method}><span>{row.method}</span><strong>{row.count.toLocaleString("sv-SE")}</strong></div>
              )) : <p>Kör live-synk och relinkning för att skapa metadata.</p>}
            </div>
          </article>
        </div>

        <article className="qualityCard qualityWideCard">
          <div className="qualityCardHeader"><span className="eyebrow">Förbättringskö</span><h2>Vanligaste omatchade utbildningarna</h2><p>Den här listan visar var nästa synonym, canonical-profil eller ämnesregel gör mest nytta.</p></div>
          <div className="qualityTableWrap">
            <table className="qualityTable">
              <thead><tr><th>Utbildning</th><th>Lärosäte</th><th>Typ</th><th>Tillfällen</th></tr></thead>
              <tbody>{quality.topUnmatched.map((row, index) => (
                <tr key={`${row.title}-${row.providerName}-${index}`}><td><strong>{row.title}</strong></td><td>{row.providerName}</td><td>{row.kind}</td><td>{row.events}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </article>

        <article className="qualityCard qualityWideCard">
          <div className="qualityCardHeader"><span className="eyebrow">Live-täckning</span><h2>Profiler med flest kopplade tillfällen</h2></div>
          <div className="qualityTableWrap">
            <table className="qualityTable">
              <thead><tr><th>Profil</th><th>Område</th><th>Tillfällen</th><th>Snittscore</th></tr></thead>
              <tbody>{quality.topCanonical.map((row) => (
                <tr key={row.id}><td><Link href={`/utbildningar/${row.id}`}><strong>{row.title}</strong></Link></td><td>{row.category}</td><td>{row.events}</td><td>{row.avgLinkScore}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
