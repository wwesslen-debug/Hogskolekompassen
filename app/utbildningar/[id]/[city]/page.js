import { notFound } from "next/navigation";
import EducationSeoLandingPage from "@/components/EducationSeoLandingPage";
import { getEducationCategoryBySlug } from "@/lib/education-categories";
import { canonicalUrl, siteName } from "@/lib/site";
import { getEducationCategoryCityPath, getEducationCityBySlug } from "@/lib/seo-landings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const routeParams = await params;
  const category = getEducationCategoryBySlug(routeParams?.id);
  const cityPage = getEducationCityBySlug(routeParams?.city);

  if (!category || !cityPage) {
    return {
      title: "Utbildningssidan hittades inte",
      robots: { index: false, follow: true },
    };
  }

  const path = getEducationCategoryCityPath(category, cityPage);
  const title = `${category.title} i ${cityPage.city}`;
  const description = `Jämför aktuella ${category.label.toLowerCase()} i ${cityPage.city}. Se program, lärosäten, studietakt och länkar till originalkällor.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(path) },
    openGraph: {
      type: "website",
      url: canonicalUrl(path),
      title,
      description,
      siteName,
      locale: "sv_SE",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function EducationCategoryCityPage({ params }) {
  const routeParams = await params;
  const category = getEducationCategoryBySlug(routeParams?.id);
  const cityPage = getEducationCityBySlug(routeParams?.city);

  if (!category || !cityPage) notFound();

  return <EducationSeoLandingPage category={category} cityPage={cityPage} />;
}
