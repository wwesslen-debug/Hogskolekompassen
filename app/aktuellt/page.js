import Link from "next/link";
import LiveEducationBrowser from "@/components/LiveEducationBrowser";
import { getLiveDataStatus, getLiveFilterOptions } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Aktuellt utbildningsutbud",
  description:
    "Filtrera aktuella svenska högskoleutbildningar från Susa-navet när livekatalogen är synkad i produktion.",
  alternates: { canonical: canonicalUrl("/aktuellt") },
};

export default async function CurrentEducationPage() {
  const [status, options] = await Promise.all([
    getLiveDataStatus(),
    getLiveFilterOptions(),
  ]);

  return (
    <main className="browserPage liveBrowserPage">
      <section className="shell browserHeader liveBrowserHeader">
        <div className="liveTitleRow">
          <div>
            <span className="eyebrow">Susa-navet · universitet & högskola · HS</span>
            <h1>Aktuellt utbildningsutbud</h1>
            <p className="lead">
              Här visas verkliga universitets- och högskoleutbildningar som har synkats från Skolverkets Susa-nav med skolformskoden HS. Filtrera på starttermin,
              ansökningsläge, lärosäte, ort och utbildningstyp. Högskolekompassens egna profiler används fortfarande för själva
              matchningen; live-datan visar vilka utbildningar som faktiskt erbjuds.
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
              <strong>{status.eventCount ? `${status.eventCount} synkade tillfällen` : "Ingen livesynk ännu"}</strong>
              <small>{status.lastSync?.value ? `Senast synkad ${new Date(status.lastSync.value).toLocaleString("sv-SE")}` : "Kör npm run susa:sync lokalt"}</small>
              {status.linkedCount ? <small>{status.linkedCount.toLocaleString("sv-SE")} profilkopplade · {status.linkRate}% täckning</small> : null}
            </div>
            <Link href="/datakvalitet" className="qualityStatusLink">Se länk-kvalitet & täckning →</Link>
          </div>
        </div>
      </section>

      <section className="shell browserSection">
        <LiveEducationBrowser initialOptions={options} initialStatus={status} />
      </section>
    </main>
  );
}
