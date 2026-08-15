import Link from "next/link";
import { canonicalUrl, contactEmail } from "@/lib/site";

export const metadata = {
  title: "Kontakt",
  description:
    "Kontakta Högskolekompassen om fel, datafrågor, integritet eller feedback.",
  alternates: { canonical: canonicalUrl("/kontakt") },
};

export default function ContactPage() {
  return (
    <main className="infoPage">
      <section className="shell infoHero">
        <span className="eyebrow">Kontakt</span>
        <h1>Hittat något som känns fel eller oklart?</h1>
        <p className="lead">
          Skicka gärna felrapporter, datakorrigeringar och feedback. Särskilt värdefullt är saker som
          gör att en ny användare tappar förtroende eller inte kommer vidare.
        </p>
      </section>

      <section className="shell infoSection">
        <div className="contactPanel">
          <span className="eyebrow">E-post</span>
          <h2><a href={`mailto:${contactEmail}`}>{contactEmail}</a></h2>
          <p>
            Beskriv gärna vilken sida du var på, vilken utbildning det gällde och vad som såg fel ut. För utbildnings-
            och antagningsbeslut ska du alltid kontakta lärosätet eller Antagning.se.
          </p>
        </div>

        <div className="infoActions">
          <Link className="button" href="/datakalla">Kontrollera datakälla</Link>
          <Link className="button buttonGhost" href="/integritet">Integritet</Link>
        </div>
      </section>
    </main>
  );
}
