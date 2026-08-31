import Link from "next/link";
import { getLiveDataStatus, getLiveLinkQuality } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datakvalitet",
  description:
    "Följ liveutbildningar, datatäckning och interna matchningssignaler från Susa-navet.",
  alternates: { canonical: canonicalUrl("/datakvalitet") },
};

function pct(part, total) {
  return total ? `${(part / total * 100).toFixed(1)}%` : "0%";
}

const methodLabels = {
  "exact-title": "Exakt titelmatchning",
  "title-containment": "Titelmatchning",
  "title-tokens": "Gemensamma titelord",
  "title-tags": "Titel + profilord",
  "lexical": "Språklig likhet",
  "lexical+subject": "Språklig likhet + ämneskod",
  "okänd": "Äldre automatisk matchning",
};

const methodDescriptions = {
  "okänd": "Metodmetadata saknas för de här äldre länkarna.",
};

function methodLabel(method) {
  return methodLabels[method] || method || "Äldre automatisk matchning";
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
          Här går det att följa hur mycket liveutbildningsdata som är synkad och hur många poster som har extra interna
          matchningssignaler. Även poster utan sådan koppling kan fortfarande matchas direkt från sin livedata.
        </p>
        <div className="qualityMetaRow">
          <span>Skolform: <strong>{status.schoolType || "HS"}</strong></span>
          <span>Senaste synk: <strong>{status.lastSync?.value ? new Date(status.lastSync.value).toLocaleString("sv-SE") : "saknas"}</strong></span>
          <Link href="/utbildningar" className="textButton">Öppna utbildningar →</Link>
        </div>
      </section>

      <section className="shell qualitySection">
        <div className="qualityStatsGrid">
          <article><span>Programstarter</span><strong>{quality.total.toLocaleString("sv-SE")}</strong><small>Grundnivå från Susa-navet</small></article>
          <article><span>Med intern signal</span><strong>{quality.linked.toLocaleString("sv-SE")}</strong><small>{quality.linkRate}% av live-utbudet</small></article>
          <article><span>Hög länksäkerhet</span><strong>{quality.confidence.high.toLocaleString("sv-SE")}</strong><small>≥ 75% länkscore</small></article>
          <article><span>Direktmatchade</span><strong>{quality.unlinked.toLocaleString("sv-SE")}</strong><small>synliga och matchbara från livedata</small></article>
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
                <div key={row.method}>
                  <span>{methodLabel(row.method)}{methodDescriptions[row.method] ? <small>{methodDescriptions[row.method]}</small> : null}</span>
                  <strong>{row.count.toLocaleString("sv-SE")}</strong>
                </div>
              )) : <p>Kör live-synk och relinkning för att skapa metadata.</p>}
            </div>
          </article>
        </div>

        <article className="qualityCard qualityWideCard">
            <div className="qualityCardHeader"><span className="eyebrow">Förbättringskö</span><h2>Utbildningar utan extra matchningssignal</h2><p>Den här listan visar var nästa synonym eller ämnesregel gör mest nytta.</p></div>
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
          <div className="qualityCardHeader"><span className="eyebrow">Live-täckning</span><h2>Interna signaler med flest kopplade tillfällen</h2></div>
          <div className="qualityTableWrap">
            <table className="qualityTable">
              <thead><tr><th>Signal</th><th>Område</th><th>Tillfällen</th><th>Snittscore</th></tr></thead>
              <tbody>{quality.topCanonical.map((row) => (
                <tr key={row.id}><td><strong>{row.title}</strong></td><td>{row.category}</td><td>{row.events}</td><td>{row.avgLinkScore}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
