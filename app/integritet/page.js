import Link from "next/link";
import ClearUserDataButton from "@/components/ClearUserDataButton";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { canonicalUrl, contactEmail } from "@/lib/site";

export const metadata = {
  title: "Integritet",
  description:
    "Så hanterar Högskolekompassen dina svar, sparade utbildningar, jämförelser och enklare användningsstatistik.",
  alternates: { canonical: canonicalUrl("/integritet") },
};

export default function PrivacyPage() {
  return (
    <main className="infoPage">
      <section className="shell infoHero">
        <span className="eyebrow">Integritet</span>
        <h1>Dina val ska hjälpa dig, inte bli ett register.</h1>
        <p className="lead">
          Högskolekompassen är byggd för att kunna användas utan konto. De flesta val sparas bara i din webbläsare så
          att du kan komma tillbaka till resultat, jämförelser och Min väg.
        </p>
      </section>

      <section className="shell infoSection legalText">
        <h2>Vad som skickas till servern</h2>
        <p>
          När du slutför kompassen skickas dina svar, dina tre intresseval och eventuella prioriteringar/deal-breakers
          till appens matchnings-API för att beräkna resultatet. Uppgifterna används för den beräkningen och sparas inte
          som en personlig profil i tjänsten. Råa quizsvar, valda intressen och fullständiga resultat ska inte loggas i
          analytics eller serverloggar.
        </p>

        <h2>Vad som sparas, varför och hur länge</h2>
        <div className="privacyTableWrap">
          <table className="privacyTable">
            <thead>
              <tr>
                <th>Uppgift eller lagring</th>
                <th>Varför</th>
                <th>Rättslig grund</th>
                <th>Lagringstid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quizsvar, intresseval och övriga quizval som skickas till matchnings-API:t</td>
                <td>För att räkna fram resultatet du begär.</td>
                <td>Berättigat intresse att leverera funktionen.</td>
                <td>Behandlas vid beräkningen och sparas inte som profil i tjänsten.</td>
              </tr>
              <tr>
                <td>Resultat i sessionStorage</td>
                <td>För att kunna visa resultatsidan och använda din senaste profil lokalt.</td>
                <td>Nödvändig lokal lagring för efterfrågad funktion.</td>
                <td>Tills fliken/sessionen stängs eller du rensar datan.</td>
              </tr>
              <tr>
                <td>Sparade utbildningar och jämförelser i localStorage</td>
                <td>För Min väg och jämförelsefunktionen utan konto.</td>
                <td>Nödvändig lokal lagring för val du själv gör.</td>
                <td>Tills du rensar dem eller tömmer webbplatsdata.</td>
              </tr>
              <tr>
                <td>Samtyckesval i localStorage</td>
                <td>För att komma ihåg om du godkänt analys och annonser.</td>
                <td>Nödvändig lagring av integritetsval.</td>
                <td>Tills du ändrar valet eller rensar webbplatsdata.</td>
              </tr>
              <tr>
                <td>Analys-event</td>
                <td>För att förstå vilka delar av sidan som behöver förbättras.</td>
                <td>Samtycke.</td>
                <td>Tekniska loggar hos driftleverantören enligt deras logghantering.</td>
              </tr>
              <tr>
                <td>Google AdSense</td>
                <td>För att visa och mäta annonser.</td>
                <td>Samtycke.</td>
                <td>Styrs av Google och dina cookieval.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Analytics</h2>
        <p>
          Appen kan logga enkla funnel-event, till exempel sidvisning, öppnad utbildning, sparad/jämförd utbildning och
          klick vidare till ansökningsinformation. Detta sker bara om du godkänner analys. Eventen ska användas för att
          förbättra tjänsten, inte för att skapa personliga profiler. Råa quizsvar, fulla resultat, profiler och
          matchlistor filtreras bort även om de skulle skickas av misstag.
        </p>

        <h2>Annonser</h2>
        <p>
          Högskolekompassen kan visa annonser via Google AdSense, men AdSense laddas först om du godkänner annonser.
          Google kan då använda cookies eller liknande tekniker enligt sina egna villkor och integritetspolicy.
          Annonsformat får inte påverka resultat, ranking eller utbildningsrekommendationer.
        </p>

        <h2>Tredje parter</h2>
        <p>
          Railway används för drift av webbappen och kan behandla tekniska serverloggar. Supabase används som databas
          för den offentliga utbildningskatalogen, inte för att lagra personliga quizprofiler. Google AdSense används
          bara efter annonssamtycke och kan då behandla annonsrelaterade uppgifter enligt Googles villkor.
        </p>

        <h2>Rensa eller ändra dina val</h2>
        <p>
          Du kan rensa sparade resultat, jämförelser, Min väg och cookieval i den här webbläsaren. Du kan också ändra
          cookie- och samtyckesval när som helst.
        </p>
        <div className="privacyToolGrid">
          <ClearUserDataButton />
          <CookieSettingsButton className="button buttonGhost" />
        </div>

        <h2>Kontakt</h2>
        <p>
          Frågor om integritet eller rättelser kan skickas till <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>

        <div className="infoActions">
          <Link className="button buttonGhost" href="/kontakt">Kontakt</Link>
          <Link className="button" href="/kompass">Starta kompassen</Link>
        </div>
      </section>
    </main>
  );
}
