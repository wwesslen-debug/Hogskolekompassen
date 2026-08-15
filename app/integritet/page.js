import Link from "next/link";
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
          När du slutför kompassen skickas dina svar till appens matchnings-API för att beräkna resultatet. Svaren
          används för den beräkningen och sparas inte som en personlig profil i tjänsten.
        </p>

        <h2>Vad som sparas i webbläsaren</h2>
        <p>
          Resultat, sparade utbildningar och jämförelser kan sparas i din webbläsare via sessionStorage och localStorage.
          Du kan rensa detta genom att tömma webbplatsdata i webbläsaren.
        </p>

        <h2>Analytics</h2>
        <p>
          Appen loggar enkla funnel-event, till exempel besök, startad kompass, slutförd kompass, öppnad utbildning,
          sparad/jämförd utbildning och klick vidare till ansökningsinformation. Eventen ska användas för att förstå vad
          som behöver förbättras i nästa version, inte för att skapa personliga profiler.
        </p>

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
