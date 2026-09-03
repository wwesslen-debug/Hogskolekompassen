import Link from "next/link";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import { getLiveDataStatus, getLiveOfferings } from "@/lib/db";
import { cleanLiveText } from "@/lib/live-text";
import { formatLiveDate, getLiveApplicationStatus, getLiveCreditsLabel } from "@/lib/live-format";
import { getLiveExternalLink, liveEducationPath } from "@/lib/live-urls";
import { canonicalUrl } from "@/lib/site";
import { educationCategoryPages, getEducationCategoryPath } from "@/lib/education-categories";

const OFFERING_LIMIT = 12;

function excerpt(value, maxLength = 220) {
  const text = cleanLiveText(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

function uniqueOfferings(groups) {
  const byId = new Map();
  for (const offering of groups.flat()) {
    if (offering?.id && !byId.has(offering.id)) byId.set(offering.id, offering);
  }
  return [...byId.values()];
}

async function getCategoryOfferings(category) {
  const groups = await Promise.all(
    category.searchQueries.map((search) => getLiveOfferings({ search, limit: 24 }))
  );
  const merged = uniqueOfferings(groups);
  const exact = merged.filter((offering) => offering.inferredCategory === category.label);
  const related = merged.filter((offering) => offering.inferredCategory !== category.label);
  return [...exact, ...related].slice(0, OFFERING_LIMIT);
}

function structuredData(category, offerings) {
  const path = getEducationCategoryPath(category);
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.title,
    description: category.metaDescription,
    url: canonicalUrl(path),
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

  return JSON.parse(JSON.stringify(data));
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
        {offering.description ? <p className="liveOfferingDescription">{excerpt(offering.description)}</p> : null}
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
              source: `seo_category_${target.source}`,
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

export default async function EducationCategoryPage({ category }) {
  const [status, offerings] = await Promise.all([
    getLiveDataStatus(),
    getCategoryOfferings(category),
  ]);
  const searchHref = `/utbildningar?search=${encodeURIComponent(category.searchQueries[0] || category.label)}`;
  const otherCategories = educationCategoryPages.filter((item) => item.slug !== category.slug);

  return (
    <main className="educationCategoryPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(category, offerings)) }}
      />

      <section className="shell categoryHero">
        <nav className="educationBreadcrumb" aria-label="Brödsmulor">
          <Link href="/utbildningar">Utbildningar</Link>
          <span>/</span>
          <span>{category.label}</span>
        </nav>

        <div className="categoryHeroGrid">
          <div className="categoryHeroCopy">
            <span className="eyebrow">Utbildningsområde</span>
            <h1>{category.title}</h1>
            <p className="lead">{category.intro}</p>
            <div className="categoryHeroActions">
              <Link href="/kompass" className="button">Gör kompassen</Link>
              <Link href={searchHref} className="button buttonGhost">Sök i hela katalogen</Link>
            </div>
          </div>
          <aside className="categoryHeroFacts" aria-label="Liveöversikt">
            <div>
              <span>Livekatalog</span>
              <strong>{status.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} programstarter` : "Väntar på synk"}</strong>
            </div>
            <div>
              <span>Visas här</span>
              <strong>{offerings.length ? `${offerings.length} exempel` : "Intro + länkar"}</strong>
            </div>
            <div>
              <span>Källa</span>
              <strong>Susa-navet</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell categoryGuideSection" aria-label={`Vägledning för ${category.label}`}>
        <div className="categoryGuideGrid">
          {category.guide.map(([title, body]) => (
            <article className="categoryGuideCard" key={title}>
              <span>{title}</span>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell categoryLiveSection">
        <div className="sectionHeading compactHeading categoryLiveHeading">
          <div>
            <span className="eyebrow">Aktuella utbildningar</span>
            <h2>Programstarter inom {category.label.toLowerCase()}</h2>
          </div>
          <p>
            Träffarna hämtas från livekatalogen och prioriterar utbildningar som matchar området. Använd detaljsidan för att spara, jämföra och öppna lärosätets egen sida när den finns.
          </p>
        </div>

        {offerings.length ? (
          <div className="liveOfferingList categoryOfferingList">
            {offerings.map((offering) => <OfferingCard offering={offering} key={offering.id} />)}
          </div>
        ) : (
          <div className="categoryEmptyLive">
            <h2>Liveutbildningar visas här när katalogen är synkad</h2>
            <p>Sidan är indexerbar redan nu med egen text och metadata. När livekatalogen innehåller matchande poster fylls listan automatiskt.</p>
            <Link href={searchHref} className="button buttonGhost">Sök i utbildningskatalogen</Link>
          </div>
        )}
      </section>

      <section className="shell categoryMoreSection">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Fler områden</span>
            <h2>Utforska närliggande utbildningar</h2>
          </div>
          <p>Om du är osäker kan kompassen väga flera områden samtidigt och visa vilka aktuella programstarter som passar din profil bäst.</p>
        </div>
        <div className="categoryLinkCloud">
          {otherCategories.map((item) => (
            <Link href={getEducationCategoryPath(item)} key={item.slug}>{item.label}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
