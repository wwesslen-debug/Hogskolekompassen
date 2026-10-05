import LiveEducationBrowser from "@/components/LiveEducationBrowser";
import { getLiveDataStatus } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";
import { getAdSenseConfig } from "@/lib/ads";
import AdSenseUnit from "@/components/AdSenseUnit";
import Link from "next/link";
import { educationCategoryPages, getEducationCategoryPath } from "@/lib/education-categories";
import {
  educationCityPages,
  getEducationCategoryCityPath,
  getPopularSeoLinks,
} from "@/lib/seo-landings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Utbildningar",
  description:
    "Sök, filtrera och jämför aktuella svenska högskoleprogram från Susa-navet.",
  alternates: { canonical: canonicalUrl("/utbildningar") },
};

export default async function ProgramsPage() {
  const status = await getLiveDataStatus();
  const catalogAd = getAdSenseConfig("catalogInline");
  const popularSeoLinks = getPopularSeoLinks();
  const stockholm = educationCityPages.find((item) => item.slug === "stockholm");
  const goteborg = educationCityPages.find((item) => item.slug === "goteborg");
  const economy = educationCategoryPages.find((item) => item.slug === "ekonomi");
  const tech = educationCategoryPages.find((item) => item.slug === "teknik-it");
  const psychology = educationCategoryPages.find((item) => item.slug === "psykologi");
  const programmaticExamples = [
    economy && stockholm ? {
      label: "Ekonomiutbildningar i Stockholm",
      href: getEducationCategoryCityPath(economy, stockholm),
    } : null,
    tech && stockholm ? {
      label: "IT-utbildningar i Stockholm",
      href: getEducationCategoryCityPath(tech, stockholm),
    } : null,
    tech && goteborg ? {
      label: "IT-utbildningar i Göteborg",
      href: getEducationCategoryCityPath(tech, goteborg),
    } : null,
    psychology && stockholm ? {
      label: "Psykologiutbildningar i Stockholm",
      href: getEducationCategoryCityPath(psychology, stockholm),
    } : null,
  ].filter(Boolean);

  return (
    <main className="browserPage liveBrowserPage">
      <section className="shell browserHeader liveBrowserHeader">
        <div className="liveTitleRow">
          <div>
            <span className="eyebrow">Utbildningar · live från Susa-navet</span>
            <h1>Aktuella utbildningar</h1>
            <p className="lead">
              Här visas det synkade utbudet av svenska högskoleprogram på grundnivå som bara kräver grundläggande
              behörighet, gymnasiekompetens eller motsvarande. Du kan söka, filtrera, jämföra riktiga utbildningar och
              öppna länkar till lärosätenas egna sidor när de finns i livedatan. Program med särskild behörighet,
              arbetsprov, tidigare högskolestudier eller avancerad nivå filtreras bort.
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
              {status.providerCount ? <small>{status.providerCount.toLocaleString("sv-SE")} lärosäten i synken</small> : null}
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

      <section className="shell categoryIndexSection" aria-labelledby="category-index-title">
        <div className="sectionHeading compactHeading categoryIndexHeading">
          <div>
            <span className="eyebrow">Utbildningsområden</span>
            <h2 id="category-index-title">Hitta rätt område snabbare</h2>
          </div>
          <p>Varje område har en egen sida med kort vägledning, metadata för sök och aktuella programstarter från livekatalogen.</p>
        </div>
        <div className="categoryLinkGrid">
          {educationCategoryPages.map((category) => (
            <Link className="categoryLinkCard" href={getEducationCategoryPath(category)} key={category.slug}>
              <span>{category.label}</span>
              <strong>{category.title}</strong>
              <small>{category.indexDescription}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell seoQuerySection" aria-labelledby="popular-searches-title">
        <div className="sectionHeading compactHeading categoryIndexHeading">
          <div>
            <span className="eyebrow">Populära sökningar</span>
            <h2 id="popular-searches-title">Fler vägar in i utbildningsutbudet</h2>
          </div>
          <p>Guider, orter och kombinationer av område och stad ger snabbare ingångar till vanliga utbildningssökningar.</p>
        </div>
        <div className="seoQueryGrid">
          {[...popularSeoLinks, ...programmaticExamples].map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </div>
      </section>

      <section className="shell browserSection">
        <LiveEducationBrowser initialStatus={status} />
      </section>
    </main>
  );
}
