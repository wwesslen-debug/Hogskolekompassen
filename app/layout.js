import "./globals.css";
import Header from "@/components/Header";
import CompareTray from "@/components/CompareTray";
import AnalyticsEvents from "@/components/AnalyticsEvents";
import AdSenseLoader from "@/components/AdSenseLoader";
import CookieConsent from "@/components/CookieConsent";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { adsenseClient } from "@/lib/ads";
import { canonicalUrl, siteName, siteUrl } from "@/lib/site";

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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>
        <CookieConsent />
        <AdSenseLoader client={adsenseClient} />
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
              <CookieSettingsButton />
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
