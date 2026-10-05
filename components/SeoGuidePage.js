import Link from "next/link";
import { canonicalUrl, siteName } from "@/lib/site";

function faqStructuredData(faq = []) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function pageStructuredData(guide) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: guide.title,
    description: guide.metaDescription,
    url: canonicalUrl(guide.path),
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: canonicalUrl("/"),
    },
  };
}

export default function SeoGuidePage({ guide }) {
  const faqData = faqStructuredData(guide.faq);

  return (
    <main className="seoGuidePage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageStructuredData(guide)) }}
      />
      {faqData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
        />
      ) : null}

      <section className="shell seoHero">
        <div className="seoHeroGrid">
          <div className="seoHeroCopy">
            <span className="eyebrow">{guide.eyebrow}</span>
            <h1>{guide.title}</h1>
            <p className="lead">{guide.lead}</p>
            <div className="seoActions">
              <Link href={guide.primaryCta.href} className="button">{guide.primaryCta.label}</Link>
              <Link href={guide.secondaryCta.href} className="button buttonGhost">{guide.secondaryCta.label}</Link>
            </div>
          </div>
          <aside className="seoHeroPanel" aria-label="Snabbguide">
            {guide.highlights.map((item, index) => (
              <div key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="shell seoContentSection">
        <div className="seoContentGrid">
          {guide.sections.map((section) => (
            <article className="seoPanel" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell seoFaqSection">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Vanliga frågor</span>
            <h2>Frågor om {guide.title.toLowerCase()}</h2>
          </div>
        </div>
        <div className="seoFaqList">
          {guide.faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="shell seoRelatedSection">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Nästa steg</span>
            <h2>Fortsätt utforska</h2>
          </div>
        </div>
        <div className="seoRelatedGrid">
          {guide.relatedLinks.map((item) => (
            <Link href={item.href} key={`${guide.slug}-${item.href}`}>{item.label}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
