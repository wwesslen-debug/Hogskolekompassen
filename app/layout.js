import "./globals.css";
import Header from "@/components/Header";
import CompareTray from "@/components/CompareTray";

export const metadata = {
  title: "Högskolekompassen – hitta utbildningar som passar dig",
  description:
    "Svara på 50 frågor, få adaptiva följdfrågor vid behov och jämför transparenta matchningar mot svenska utbildningsområden och högskoleprogram.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>
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
              <p>En prototyp för smartare och mer personligt utbildningsval.</p>
            </div>
            <p className="footerNote">
              Oberoende prototyp. Inte ansluten till UHR, Antagning.se eller något lärosäte.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
