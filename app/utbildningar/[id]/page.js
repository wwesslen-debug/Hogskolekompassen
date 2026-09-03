import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import TrackedExternalLink from "@/components/TrackedExternalLink";
import EducationCategoryPage from "@/components/EducationCategoryPage";
import { getLiveOfferings } from "@/lib/db";
import { cleanLiveText } from "@/lib/live-text";
import { formatLiveDate, getLiveApplicationStatus, getLiveCreditsLabel } from "@/lib/live-format";
import { getLiveApplicationLink, getLiveSourceLink, liveEducationIdFromRouteParam, liveEducationPath } from "@/lib/live-urls";
import { getEducationCategoryBySlug, getEducationCategoryPath } from "@/lib/education-categories";
import { canonicalUrl, cleanDescription } from "@/lib/site";

export const dynamic = "force-dynamic";

const levelLabels = {
  grund: "Grundnivå",
  avancerad: "Avancerad nivå",
};

const kindLabels = {
  program: "Program",
  course: "Kurs",
  kurs: "Kurs",
};

const getOfferingByRouteId = cache(async (routeId) => {
  const id = liveEducationIdFromRouteParam(routeId);
  if (!id) return null;
  const offerings = await getLiveOfferings({ ids: [id], limit: 1, upcoming: false });
  return offerings[0] || null;
});

function displayKind(value) {
  return kindLabels[value] || value || "Utbildning";
}

function displayLevel(value) {
  return levelLabels[value] || value || "Ej angiven";
}

function fact(label, value) {
  return value ? { label, value } : null;
}

function compactDate(value) {
  return formatLiveDate(value) || null;
}

function buildFacts(offering, application) {
  return [
    fact("Start", compactDate(offering.startDate)),
    fact("Starttermin", offering.period),
    fact("Ansökan", application.label),
    fact("Omfattning", getLiveCreditsLabel(offering)),
    fact("Studieform", offering.distance ? "Distans" : offering.studyForm),
    fact("Studietakt", offering.studyPace),
    fact("Nivå", displayLevel(offering.level)),
    fact("Examen", offering.degree),
    fact("Studiemedel", offering.studentAid === "ja" ? "CSN-berättigad" : offering.studentAid),
    fact("Språk", offering.language),
    fact("Anmälningskod", offering.applicationCode),
  ].filter(Boolean);
}

function splitText(value) {
  const text = cleanLiveText(value);
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ])/)
    .reduce((paragraphs, sentence) => {
      const previous = paragraphs[paragraphs.length - 1] || "";
      if (!previous || previous.length + sentence.length > 520) paragraphs.push(sentence);
      else paragraphs[paragraphs.length - 1] = `${previous} ${sentence}`;
      return paragraphs;
    }, []);
}

function removeEmpty(value) {
  if (Array.isArray(value)) return value.map(removeEmpty).filter((item) => item != null);
  if (!value || typeof value !== "object") return value ?? undefined;

  const entries = Object.entries(value)
    .map(([key, item]) => [key, removeEmpty(item)])
    .filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0));

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function structuredData(offering) {
  const path = liveEducationPath(offering);
  const source = getLiveApplicationLink(offering)?.href || getLiveSourceLink(offering)?.href || "";
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: offering.title,
    description: cleanLiveText(offering.description),
    url: canonicalUrl(path),
    sameAs: source ? [source] : undefined,
    courseCode: offering.applicationCode,
    educationalCredentialAwarded: offering.degree,
    provider: offering.providerName ? {
      "@type": "CollegeOrUniversity",
      name: offering.providerName,
    } : undefined,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: offering.distance ? "online" : offering.studyForm,
      startDate: offering.startDate,
      endDate: offering.endDate,
      location: offering.city ? {
        "@type": "Place",
        name: offering.city,
      } : undefined,
    },
  };

  return removeEmpty(data);
}

export async function generateMetadata({ params }) {
  const routeParams = await params;
  const category = getEducationCategoryBySlug(routeParams?.id);

  if (category) {
    const path = getEducationCategoryPath(category);
    return {
      title: category.title,
      description: category.metaDescription,
      alternates: { canonical: canonicalUrl(path) },
      openGraph: {
        type: "website",
        url: canonicalUrl(path),
        title: category.title,
        description: category.metaDescription,
        siteName: "Högskolekompassen",
        locale: "sv_SE",
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  const offering = await getOfferingByRouteId(routeParams?.id);

  if (!offering) {
    return {
      title: "Utbildningen hittades inte",
      robots: { index: false, follow: true },
    };
  }

  const path = liveEducationPath(offering);
  const providerLine = [offering.providerName, offering.city, offering.period].filter(Boolean).join(", ");
  const description = cleanDescription(`${offering.description || ""} ${providerLine}`.trim(), 158);

  return {
    title: offering.title,
    description,
    alternates: { canonical: canonicalUrl(path) },
    openGraph: {
      type: "article",
      url: canonicalUrl(path),
      title: `${offering.title}${offering.providerName ? ` – ${offering.providerName}` : ""}`,
      description,
      siteName: "Högskolekompassen",
      locale: "sv_SE",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LiveEducationDetailPage({ params }) {
  const routeParams = await params;
  const category = getEducationCategoryBySlug(routeParams?.id);

  if (category) return <EducationCategoryPage category={category} />;

  const offering = await getOfferingByRouteId(routeParams?.id);

  if (!offering) notFound();

  const application = getLiveApplicationStatus(offering, {
    deadlineVerb: "Ansök senast",
    fallback: "Kontrollera ansökan",
    unknownTone: "neutral",
  });
  const applicationLink = getLiveApplicationLink(offering);
  const sourceLink = getLiveSourceLink(offering);
  const descriptionParagraphs = splitText(offering.description);
  const eligibilityParagraphs = splitText(offering.eligibility);
  const facts = buildFacts(offering, application);
  const relatedSearch = new URLSearchParams({ search: offering.title });

  if (offering.providerName) relatedSearch.set("provider", offering.providerName);

  return (
    <main className="educationDetailPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(offering)) }}
      />

      <section className="shell educationDetailHero">
        <nav className="educationBreadcrumb" aria-label="Brödsmulor">
          <Link href="/utbildningar">Utbildningar</Link>
          <span>/</span>
          <span>{offering.providerName || "Liveutbildning"}</span>
        </nav>

        <div className="educationDetailGrid">
          <div className="educationDetailMain">
            <div className="liveOfferingMeta">
              {offering.period ? <span className="periodBadge">{offering.period}</span> : null}
              <span>{displayKind(offering.kind)}</span>
              {offering.inferredCategory ? <span>{offering.inferredCategory}</span> : null}
              {offering.distance ? <span>Distans</span> : null}
              {offering.credits ? <span>{getLiveCreditsLabel(offering)}</span> : null}
            </div>
            <h1>{offering.title}</h1>
            <p className="institutionLine">
              {offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}
            </p>
            <p className="lead">
              Aktuell utbildningspost från Susa-navet. Kontrollera alltid behörighet, innehåll och ansökan hos originalkällan innan du söker.
            </p>
            <div className="educationDetailActions">
              <CompareButton offeringId={offering.id} compact />
              <SaveProgramButton offeringId={offering.id} programId={offering.canonicalProgramId} compact />
              {applicationLink ? (
                <TrackedExternalLink
                  href={applicationLink.href}
                  className="button buttonSmall"
                  properties={{
                    source: `education_detail_${applicationLink.source}`,
                    offeringId: offering.id,
                    programId: offering.canonicalProgramId,
                  }}
                >
                  {applicationLink.label}
                </TrackedExternalLink>
              ) : null}
              {sourceLink && sourceLink.href !== applicationLink?.href ? (
                <TrackedExternalLink
                  href={sourceLink.href}
                  className="button buttonGhost buttonSmall"
                  properties={{
                    source: `education_detail_${sourceLink.source}`,
                    offeringId: offering.id,
                    programId: offering.canonicalProgramId,
                  }}
                >
                  {sourceLink.label}
                </TrackedExternalLink>
              ) : null}
            </div>
          </div>

          <aside className="educationDetailAside">
            <span className={`applicationState ${application.tone}`}>{application.label}</span>
            <div className="educationAsideFacts">
              {facts.slice(0, 5).map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="shell educationDetailSection">
        <div className="educationDetailContent">
          <div className="educationDetailMainColumn">
            <article className="educationDetailPanel">
              <span className="eyebrow">Beskrivning</span>
              <h2>Om utbildningen</h2>
              {descriptionParagraphs.length ? (
                descriptionParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              ) : (
                <p>Beskrivning saknas i livedatan. Öppna originalkällan för mer information.</p>
              )}
            </article>

            <article className="educationDetailPanel">
              <span className="eyebrow">Behörighet</span>
              <h2>Kontrollera kraven</h2>
              {eligibilityParagraphs.length ? (
                eligibilityParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              ) : (
                <p>Behörighet saknas i livedatan. Kontrollera kraven hos lärosätet eller Antagning.se.</p>
              )}
            </article>
          </div>

          <aside className="educationDetailPanel educationFactsPanel">
            <span className="eyebrow">Fakta</span>
            <h2>Snabböversikt</h2>
            <div className="educationFactGrid">
              {facts.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="educationFactActions">
              <Link href={`/utbildningar?${relatedSearch.toString()}`} className="button buttonGhost buttonSmall">Liknande utbildningar</Link>
              <Link href="/jamfor" className="button buttonGhost buttonSmall">Gå till jämför</Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
