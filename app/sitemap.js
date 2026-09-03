import { canonicalUrl } from "@/lib/site";
import { getLiveSitemapEntries } from "@/lib/db";
import { liveEducationPath } from "@/lib/live-urls";

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

  return [...staticEntries, ...educationEntries];
}
