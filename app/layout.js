import "./globals.css";
import Header from "@/components/Header";
import CompareTray from "@/components/CompareTray";
import AnalyticsEvents from "@/components/AnalyticsEvents";
import AdSenseScript from "@/components/AdSenseScript";
import { canonicalUrl, siteName, siteUrl } from "@/lib/site";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-7522543243781751";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Högskolekompassen – hitta utbildningar som passar dig",
    template: `%s | ${siteName}`,
  },
  description:
    "Gör en transparent utbildningskompass, förstå din studieprofil och hitta svenska högskoleutbildningar att kontrollera hos officiella källor.",
  alternates: {
    canonical: canonicalUrl("/"),
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: canonicalUrl("/"),
    siteName,
    title: "Högskolekompassen – hitta utbildningar som passar dig",
    description:
      "En oberoende tjänst för dig som vill välja högskoleutbildning med mer struktur: kompass, förklarad matchning och länkar vidare till officiell information.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>
        <AdSenseScript client={adsenseClient} />
        <AnalyticsEvents />
        <Header />
        {children}
        <CompareTray />
        <footer className="siteFooter">
          <div className="shell footerGrid">
            <div>
              <div className="brand footerBrand">
                <span className="brandMark" aria-hidden="true"><span /><span /><span /></span>
                <span>Högskolekompassen</span>
              </div>
              <p>Oberoende vägledning för smartare och mer personligt utbildningsval.</p>
            </div>
            <nav className="footerLinks" aria-label="Sidinformation">
              <a href="/om">Om</a>
              <a href="/datakalla">Datakälla</a>
              <a href="/integritet">Integritet</a>
              <a href="/kontakt">Kontakt</a>
            </nav>
            <p className="footerNote">
              Högskolekompassen är inte ansluten till UHR, Antagning.se, Skolverket eller något lärosäte.
              Kontrollera alltid behörighet, kursinnehåll och ansökan hos officiell källa.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
