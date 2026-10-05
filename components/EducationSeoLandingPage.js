import Link from "next/link";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import { getLiveDataStatus, getLiveOfferings } from "@/lib/db";
import { formatLiveDate, getLiveApplicationStatus, getLiveCreditsLabel } from "@/lib/live-format";
import { getLiveExternalLink, liveEducationPath } from "@/lib/live-urls";
import { canonicalUrl } from "@/lib/site";
import { educationCategoryPages, getEducationCategoryPath } from "@/lib/education-categories";
import {
  educationCityPages,
  getEducationCategoryCityPath,
  getEducationCityPath,
} from "@/lib/seo-landings";

const OFFERING_LIMIT = 12;

function uniqueOfferings(groups) {
  const byId = new Map();
  for (const offering of groups.flat()) {
    if (offering?.id && !byId.has(offering.id)) byId.set(offering.id, offering);
  }
  return [...byId.values()];
}

async function getSeoOfferings({ category, cityPage }) {
  if (category) {
    const groups = await Promise.all(
      category.searchQueries.map((search) => getLiveOfferings({
        search,
        city: cityPage.city,
        limit: 18,
      }))
    );
    return uniqueOfferings(groups).slice(0, OFFERING_LIMIT);
  }

  return getLiveOfferings({ city: cityPage.city, limit: OFFERING_LIMIT });
}

function getPageText({ category, cityPage }) {
  if (category) {
    return {
      path: getEducationCategoryCityPath(category, cityPage),
      title: `${category.title} i ${cityPage.city}`,
      eyebrow: `${category.label} · ${cityPage.city}`,
      intro:
        `Här samlas aktuella programstarter inom ${category.label.toLowerCase()} i ${cityPage.city}. Jämför upplägg, lärosäte, studietakt och länkar vidare till originalkällan innan du söker.`,
      searchHref: `/utbildningar?search=${encodeURIComponent(category.searchQueries[0] || category.label)}&city=${encodeURIComponent(cityPage.city)}`,
      listTitle: `Programstarter inom ${category.label.toLowerCase()} i ${cityPage.city}`,
    };
  }

  return {
    path: getEducationCityPath(cityPage),
    title: cityPage.title,
    eyebrow: `Utbildningsort · ${cityPage.city}`,
    intro: cityPage.intro,
    searchHref: `/utbildningar?city=${encodeURIComponent(cityPage.city)}`,
    listTitle: `Aktuella programstarter i ${cityPage.city}`,
  };
}

function structuredData({ category, cityPage, offerings }) {
  const text = getPageText({ category, cityPage });
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: text.title,
    description: text.intro,
    url: canonicalUrl(text.path),
    mainEntity: offerings.length ? {
      "@type": "ItemList",
      itemListElement: offerings.slice(0, 10).map((offering, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: canonicalUrl(liveEducationPath(offering)),
        name: offering.title,
      })),
    } : undefined,
  };
}

function OfferingCard({ offering }) {
  const application = getLiveApplicationStatus(offering, { fallback: "Kontrollera ansökan", unknownTone: "neutral" });
  const target = getLiveExternalLink(offering);
  const detailPath = liveEducationPath(offering);
  const facts = [
    offering.startDate ? ["Start", formatLiveDate(offering.startDate)] : null,
    offering.studyPace ? ["Studietakt", offering.studyPace] : null,
    offering.credits ? ["Omfattning", getLiveCreditsLabel(offering)] : null,
    offering.level ? ["Nivå", offering.level === "grund" ? "Grundnivå" : offering.level] : null,
  ].filter(Boolean);

  return (
    <article className="liveOfferingCard categoryOfferingCard">
      <div className="liveOfferingMain">
        <div className="liveOfferingMeta">
          {offering.period ? <span className="periodBadge">{offering.period}</span> : null}
          {offering.kind ? <span>{offering.kind === "program" ? "Program" : offering.kind}</span> : null}
          {offering.inferredCategory ? <span>{offering.inferredCategory}</span> : null}
          {offering.distance ? <span>Distans</span> : null}
        </div>
        <h2><Link href={detailPath}>{offering.title}</Link></h2>
        <p className="institutionLine">
          {offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}
        </p>
        {offering.description ? <p className="liveOfferingDescription">{offering.description}</p> : null}
        <div className="liveOfferingFacts">
          {facts.map(([label, value]) => (
            <span key={`${offering.id}-${label}`}><small>{label}</small><strong>{value}</strong></span>
          ))}
        </div>
      </div>
      <aside className="liveOfferingAside">
        <span className={`applicationState ${application.tone}`}>{application.label}</span>
        <Link href={detailPath} className="button buttonGhost buttonSmall">Visa detaljer</Link>
        <CompareButton offeringId={offering.id} compact />
        <SaveProgramButton offeringId={offering.id} programId={offering.canonicalProgramId} compact />
        {target ? (
          <TrackedExternalLink
            href={target.href}
            className="button buttonSmall"
            properties={{
              source: `seo_location_${target.source}`,
              offeringId: offering.id,
              programId: offering.canonicalProgramId,
            }}
          >
            {target.label}
          </TrackedExternalLink>
        ) : null}
      </aside>
    </article>
  );
}

export default async function EducationSeoLandingPage({ category = null, cityPage }) {
  const [status, offerings] = await Promise.all([
    getLiveDataStatus(),
    getSeoOfferings({ category, cityPage }),
  ]);
  const text = getPageText({ category, cityPage });
  const nearbyCategories = educationCategoryPages
    .filter((item) => item.slug !== category?.slug)
    .slice(0, 8);
  const nearbyCities = educationCityPages.filter((item) => item.slug !== cityPage.slug);

  return (
    <main className="educationCategoryPage educationSeoPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData({ category, cityPage, offerings })) }}
      />

      <section className="shell categoryHero">
        <nav className="educationBreadcrumb" aria-label="Brödsmulor">
          <Link href="/utbildningar">Utbildningar</Link>
          <span>/</span>
          {category ? (
            <>
              <Link href={getEducationCategoryPath(category)}>{category.label}</Link>
              <span>/</span>
            </>
          ) : null}
          <span>{cityPage.city}</span>
        </nav>

        <div className="categoryHeroGrid">
          <div className="categoryHeroCopy">
            <span className="eyebrow">{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p className="lead">{text.intro}</p>
            <div className="categoryHeroActions">
              <Link href={text.searchHref} className="button">Sök i katalogen</Link>
              <Link href="/kompass" className="button buttonGhost">Gör kompassen</Link>
            </div>
          </div>
          <aside className="categoryHeroFacts" aria-label="Liveöversikt">
            <div>
              <span>Livekatalog</span>
              <strong>{status.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} programstarter` : "Väntar på synk"}</strong>
            </div>
            <div>
              <span>Ort</span>
              <strong>{cityPage.city}</strong>
            </div>
            <div>
              <span>Visas här</span>
              <strong>{offerings.length ? `${offerings.length} exempel` : "Intro + länkar"}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell categoryLiveSection">
        <div className="sectionHeading compactHeading categoryLiveHeading">
          <div>
            <span className="eyebrow">Aktuella utbildningar</span>
            <h2>{text.listTitle}</h2>
          </div>
          <p>
            Träffarna hämtas från livekatalogen och ska ses som en startpunkt. Kontrollera alltid behörighet,
            innehåll och ansökan hos lärosätet eller annan officiell källa.
          </p>
        </div>

        {offerings.length ? (
          <div className="liveOfferingList categoryOfferingList">
            {offerings.map((offering) => <OfferingCard offering={offering} key={offering.id} />)}
          </div>
        ) : (
          <div className="categoryEmptyLive">
            <h2>Liveutbildningar visas här när katalogen har matchande poster</h2>
            <p>Sidan är indexerbar med egen text, canonical och interna länkar. När livedatan innehåller träffar fylls listan automatiskt.</p>
            <Link href={text.searchHref} className="button buttonGhost">Sök i utbildningskatalogen</Link>
          </div>
        )}
      </section>

      <section className="shell categoryMoreSection">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Fler sökvägar</span>
            <h2>Utforska fler utbildningssidor</h2>
          </div>
        </div>
        <div className="categoryLinkCloud">
          {category ? nearbyCities.map((item) => (
            <Link href={getEducationCategoryCityPath(category, item)} key={`${category.slug}-${item.slug}`}>
              {category.label} i {item.city}
            </Link>
          )) : nearbyCategories.map((item) => (
            <Link href={getEducationCategoryCityPath(item, cityPage)} key={`${item.slug}-${cityPage.slug}`}>
              {item.label} i {cityPage.city}
            </Link>
          ))}
          {nearbyCities.map((item) => (
            <Link href={getEducationCityPath(item)} key={item.slug}>{item.title}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
