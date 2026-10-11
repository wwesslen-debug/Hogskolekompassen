import LiveEducationBrowser from "@/components/LiveEducationBrowser";
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

export const metadata = {
  title: "Utbildningar",
  description:
    "Sök, filtrera och jämför aktuella svenska högskoleprogram från Susa-navet.",
  alternates: { canonical: canonicalUrl("/utbildningar") },
};

export default function ProgramsPage() {
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
          </div>
          <div className="liveStatusColumn">
            <div className="liveStatusCard isLive">
              <span className="liveDot" />
              <strong>Livekatalog</strong>
              <small>Hämtas från Susa-navet via Supabase</small>
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
        <LiveEducationBrowser />
      </section>
    </main>
  );
}
