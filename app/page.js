import { getLiveDataStatus, getProgramCount } from "@/lib/db";
import { getAdSenseConfig } from "@/lib/ads";
import AdSenseUnit from "@/components/AdSenseUnit";
import Link from "next/link";

const dimensions = [
  ["Analys", "Problem, logik & mönster"],
  ["Teknik", "Digitalt, system & AI"],
  ["Människor", "Relationer & samarbete"],
  ["Kreativitet", "Idéer, form & uttryck"],
  ["Affär", "Strategi & entreprenörskap"],
  ["Samhälle", "Policy, rätt & påverkan"],
  ["Natur", "Vetenskap & forskning"],
  ["Hälsa", "Vård & välmående"],
  ["Praktik", "Tillämpning & genomförande"],
  ["Struktur", "Precision & ordning"],
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const programCount = getProgramCount();
  const liveStatus = await getLiveDataStatus();
  const homeLeftAd = getAdSenseConfig("homeLeft");
  const homeRightAd = getAdSenseConfig("homeRight");
  const homeInlineAd = getAdSenseConfig("homeInline");

  return (
    <main>
      <section className="hero">
        <AdSenseUnit
          {...homeLeftAd}
          className="manualAdRail manualAdRailLeft"
          label="Annonsplats vänster"
          format="rectangle"
          responsive={false}
        />
        <AdSenseUnit
          {...homeRightAd}
          className="manualAdRail manualAdRailRight"
          label="Annonsplats höger"
          format="rectangle"
          responsive={false}
        />
        <div className="shell heroGrid">
          <div className="heroCopy">
            <div className="eyebrow">Din väg efter gymnasiet</div>
            <h1>
              Hitta utbildningen som <span>faktiskt passar dig.</span>
            </h1>
            <p className="lead">
              Välj snabbtest med 25 frågor eller hela kompassen med 50 genomtänkta grundfrågor. Högskolekompassen analyserar dina
              intressen, drivkrafter och arbetssätt, matchar dig mot utbildningsprofiler och hjälper dig gå vidare
              till utbildningar och officiell information med mer struktur.
            </p>

            <div className="heroActions">
              <Link href="/kompass" className="button buttonLarge">
                Starta kompassen <span>→</span>
              </Link>
              <span className="microcopy">25 eller 50 frågor · cirka 4–10 min · gratis</span>
            </div>

            <div className="trustRow">
              <div><strong>17</strong><span>profildimensioner</span></div>
              <div><strong>{programCount}</strong><span>utbildningsposter</span></div>
              <div><strong>{liveStatus.eventCount || "Live"}</strong><span>{liveStatus.eventCount ? "programstarter" : "live-data"}</span></div>
            </div>
          </div>

          <div className="heroVisual" aria-label="Exempel på resultat">
            <div className="visualGlow" />
            <div className="profilePreview">
              <div className="previewTop">
                <div>
                  <span className="previewKicker">Din profil</span>
                  <h2>Teknisk problemlösare</h2>
                </div>
                <div className="scoreOrb">92</div>
              </div>

              {[
                ["Analys & problemlösning", 91],
                ["Teknik & digitalt", 88],
                ["Affär & entreprenörskap", 76],
                ["Struktur & precision", 71],
              ].map(([label, value]) => (
                <div className="previewBar" key={label}>
                  <div><span>{label}</span><strong>{value}%</strong></div>
                  <div className="miniTrack"><div className="miniFill" style={{ width: `${value}%` }} /></div>
                </div>
              ))}

              <div className="previewMatch">
                <span>Starkaste matchning</span>
                <strong>Teknik & IT</strong>
                <em>94% match</em>
              </div>
            </div>

            <div className="floatingCard floatingA">
              <span>02</span>
              <strong>Systemvetenskap</strong>
              <small>91% match</small>
            </div>
            <div className="floatingCard floatingB">
              <span>03</span>
              <strong>Industriell ekonomi</strong>
              <small>87% match</small>
            </div>
          </div>
        </div>
      </section>

      <section className="logoStrip">
        <div className="shell stripInner">
          <span>Oberoende vägledning · kontrollera alltid hos officiell källa</span>
          <div>Antagning.se</div><div>Lärosäte</div><div>Susa-navet</div><div>Behörighet</div><div>Datum</div><div>Urval</div>
        </div>
      </section>

      <AdSenseUnit
        {...homeInlineAd}
        className="shell manualAdInline manualAdAfterHero"
        label="Annons efter introduktion"
        format="horizontal"
      />

      <section className="section shell" id="hur">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">Så fungerar det</span>
            <h2>Mer än ett vanligt intressetest</h2>
          </div>
          <p>
            Varje svar påverkar flera delar av din profil. Resultatet bygger på
            en viktad matchning, adaptiva följdfrågor och transparenta delpoäng – inte på en enda kategori.
          </p>
        </div>

        <div className="stepGrid">
          <article className="stepCard">
            <span className="stepNo">01</span>
            <h3>Svara på grundfrågorna</h3>
            <p>Ta ställning till konkreta påståenden om vad du gillar, hur du arbetar och vad som motiverar dig.</p>
          </article>
          <article className="stepCard featuredStep">
            <span className="stepNo">02</span>
            <h3>Vi förfinar det som är oklart</h3>
            <p>Om två områden ligger nära varandra väljer motorn upp till fem personliga utslagsfrågor. Deal-breakers kan ge tydliga avdrag.</p>
          </article>
          <article className="stepCard">
            <span className="stepNo">03</span>
            <h3>Få ett förklarat resultat</h3>
            <p>Se totalmatch, fyra delpoäng, vad som drog upp eller ner – och spara intressanta program i Min väg.</p>
          </article>
        </div>
      </section>

      <section className="darkSection">
        <div className="shell dimensionGrid">
          <div className="dimensionIntro">
            <span className="eyebrow lightEyebrow">Matchningsmotorn</span>
            <h2>10 intressedimensioner + 7 studiepreferenser.</h2>
            <p>
              Du kan vara både teknisk och social, analytisk och kreativ. Därför tillåter modellen flera starka sidor samtidigt – och väger dessutom in matematik, programmering, teori, kommunikation, ledarskap, självständighet och studielängd.
            </p>
            <Link href="/kompass" className="button buttonLight">Testa min profil →</Link>
          </div>

          <div className="dimensionList">
            {dimensions.map(([title, desc], index) => (
              <div className="dimensionItem" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="ctaPanel">
          <div>
            <span className="eyebrow">Redo?</span>
            <h2>Gör ditt utbildningsval lite mindre slumpmässigt.</h2>
            <p>Du får en profil, adaptiva följdfrågor, transparenta delpoäng och tydligare vägar vidare till utbildningar som är värda att kontrollera närmare.</p>
          </div>
          <div className="ctaButtonStack">
            <Link href="/kompass" className="button buttonLarge">Starta Högskolekompassen →</Link>
            <Link href="/aktuellt" className="textButton">Se aktuellt utbildningsutbud</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
