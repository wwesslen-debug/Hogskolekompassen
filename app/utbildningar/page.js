import LiveEducationBrowser from "@/components/LiveEducationBrowser";
import { getLiveDataStatus, getLiveFilterOptions } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";
import { getAdSenseConfig } from "@/lib/ads";
import AdSenseUnit from "@/components/AdSenseUnit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Utbildningar",
  description:
    "Sök, filtrera och jämför aktuella svenska högskoleprogram från Susa-navet.",
  alternates: { canonical: canonicalUrl("/utbildningar") },
};

export default async function ProgramsPage() {
  const [status, options] = await Promise.all([
    getLiveDataStatus(),
    getLiveFilterOptions(),
  ]);
  const catalogAd = getAdSenseConfig("catalogInline");

  return (
    <main className="browserPage liveBrowserPage">
      <section className="shell browserHeader liveBrowserHeader">
        <div className="liveTitleRow">
          <div>
            <span className="eyebrow">Utbildningar · live från Susa-navet</span>
            <h1>Aktuella utbildningar</h1>
            <p className="lead">
              Här visas det synkade utbudet av svenska högskoleprogram på grundnivå. Du kan söka, filtrera, jämföra
              riktiga utbildningar och öppna originalkällan hos lärosäte eller antagningstjänst. Master-, magister-,
              senare-del- och avancerade program filtreras bort.
            </p>
            {status.periods?.length ? (
              <div className="livePeriodSummary">
                <span>Synkade startperioder</span>
                {status.periods.slice(0, 6).map((item) => <strong key={item.period}>{item.period} · {item.count}</strong>)}
              </div>
            ) : null}
          </div>
          <div className="liveStatusColumn">
            <div className={`liveStatusCard ${status.eventCount ? "isLive" : "isEmpty"}`}>
              <span className="liveDot" />
              <strong>{status.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} synkade utbildningar` : "Ingen livesynk ännu"}</strong>
              <small>{status.lastSync?.value ? `Senast synkad ${new Date(status.lastSync.value).toLocaleString("sv-SE")}` : "Kontrollera Supabase-konfigurationen"}</small>
              {status.linkedCount ? <small>{status.linkedCount.toLocaleString("sv-SE")} interna matchningssignaler · {status.linkRate}% täckning</small> : null}
            </div>
            <a href="/datakvalitet" className="qualityStatusLink">Se datakvalitet →</a>
          </div>
        </div>
      </section>

      <AdSenseUnit
        {...catalogAd}
        className="shell manualAdInline manualAdBetweenSections"
        label="Annons i utbildningslista"
        format="horizontal"
      />

      <section className="shell browserSection">
        <LiveEducationBrowser initialOptions={options} initialStatus={status} />
      </section>
    </main>
  );
}
