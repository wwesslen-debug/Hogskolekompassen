import { getPrograms } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";

export default function sitemap() {
  const now = new Date();
  const staticRoutes = [
    "",
    "/kompass",
    "/utbildningar",
    "/aktuellt",
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

  const programEntries = getPrograms({ limit: 1000 }).map((program) => ({
    url: canonicalUrl(`/utbildningar/${program.id}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...programEntries];
}
