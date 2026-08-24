import Link from "next/link";
import LiveEducationBrowser from "@/components/LiveEducationBrowser";
import { getLiveDataStatus, getLiveFilterOptions } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";
import { getAdSenseConfig } from "@/lib/ads";
import AdSenseUnit from "@/components/AdSenseUnit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Aktuella programstarter",
  description:
    "Filtrera aktuella svenska högskoleprogram på grundnivå från Susa-navet när livekatalogen är synkad i produktion.",
  alternates: { canonical: canonicalUrl("/aktuellt") },
};

export default async function CurrentEducationPage() {
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
            <span className="eyebrow">Susa-navet · program på grundnivå</span>
            <h1>Aktuella programstarter</h1>
            <p className="lead">
              Här kan du bläddra igenom hela det synkade utbudet av universitets- och högskoleprogram som ser ut att
              börja på grundnivå. Master-, magister- och avancerade program filtreras bort. Filter för starttermin,
              ansökningsläge, lärosäte och ort är frivilliga. Högskolekompassens egna profiler används fortfarande för
              själva matchningen; live-datan visar vilka utbildningar som faktiskt erbjuds.
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
              <small>{status.lastSync?.value ? `Senast synkad ${new Date(status.lastSync.value).toLocaleString("sv-SE")}` : "Kontrollera Supabase-konfigurationen"}</small>
              {status.linkedCount ? <small>{status.linkedCount.toLocaleString("sv-SE")} profilkopplade · {status.linkRate}% täckning</small> : null}
            </div>
            <Link href="/datakvalitet" className="qualityStatusLink">Se länk-kvalitet & täckning →</Link>
          </div>
        </div>
      </section>

      <AdSenseUnit
        {...catalogAd}
        className="shell manualAdInline manualAdBetweenSections"
        label="Annons i aktuellt utbud"
        format="horizontal"
      />

      <section className="shell browserSection">
        <LiveEducationBrowser initialOptions={options} initialStatus={status} />
      </section>
    </main>
  );
}
