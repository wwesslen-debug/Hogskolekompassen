import { canonicalUrl } from "@/lib/site";
import { getLiveSitemapEntries } from "@/lib/db";
import { liveEducationPath } from "@/lib/live-urls";
import { educationCategoryPages, getEducationCategoryPath } from "@/lib/education-categories";
import {
  educationCityPages,
  getEducationCategoryCityPath,
  getEducationCityPath,
  seoGuidePages,
} from "@/lib/seo-landings";

export default async function sitemap() {
  const now = new Date();
  const staticRoutes = [
    "",
    "/kompass",
    "/utbildningar",
    "/jamfor",
    "/karriar",
    "/min-vag",
    "/datakalla",
    "/datakvalitet",
    "/om",
    "/integritet",
    "/kontakt",
  ];

  const staticEntries = staticRoutes.map((route) => ({
    url: canonicalUrl(route || "/"),
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const liveEntries = await getLiveSitemapEntries(5000);
  const educationEntries = liveEntries.map((offering) => ({
    url: canonicalUrl(liveEducationPath(offering)),
    lastModified: offering.syncedAt || offering.lastEdited || now,
    changeFrequency: "weekly",
    priority: 0.62,
  }));

  const categoryEntries = educationCategoryPages.map((category) => ({
    url: canonicalUrl(getEducationCategoryPath(category)),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.78,
  }));

  const guideEntries = seoGuidePages.map((page) => ({
    url: canonicalUrl(page.path),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.72,
  }));

  const cityEntries = educationCityPages.map((cityPage) => ({
    url: canonicalUrl(getEducationCityPath(cityPage)),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.76,
  }));

  const categoryCityEntries = educationCategoryPages.flatMap((category) => (
    educationCityPages.map((cityPage) => ({
      url: canonicalUrl(getEducationCategoryCityPath(category, cityPage)),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  ));

  return [
    ...staticEntries,
    ...guideEntries,
    ...categoryEntries,
    ...cityEntries,
    ...categoryCityEntries,
    ...educationEntries,
  ];
}
