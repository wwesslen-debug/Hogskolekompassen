import { canonicalUrl } from "@/lib/site";

export default function sitemap() {
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

  return staticEntries;
}
