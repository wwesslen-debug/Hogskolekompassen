import { siteName } from "@/lib/site";

export default function manifest() {
  return {
    name: siteName,
    short_name: "Högskolekompassen",
    description: "Hitta utbildningar som passar dig.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#123047",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
