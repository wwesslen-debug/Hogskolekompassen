import { getLiveDataStatus } from "@/lib/db";
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
              Välj Snabbkompassen med cirka 15–20 adaptiva frågor eller Djupkompassen med cirka 40–60 frågor.
              Högskolekompassen analyserar intressen, drivkrafter och arbetssätt, utmanar sina egna hypoteser och
              matchar dig mot aktuella utbildningar från livekatalogen.
            </p>

            <div className="heroActions">
              <Link href="/kompass" className="button buttonLarge">
                Starta kompassen <span>→</span>
              </Link>
              <span className="microcopy">15–20 eller 40–60 frågor · cirka 5–15 min · gratis</span>
            </div>

            <div className="trustRow">
              <div><strong>15–20</strong><span>frågor i Snabbkompassen</span></div>
              <div><strong>40–60</strong><span>frågor i Djupkompassen</span></div>
              <div><strong>{liveStatus.eventCount ? liveStatus.eventCount.toLocaleString("sv-SE") : "Live"}</strong><span>{liveStatus.eventCount ? "aktuella utbildningar" : "utbildningsdata"}</span></div>
            </div>
          </div>

          <div className="heroVisual" aria-label="Exempel på resultat">
            <div className="visualGlow" />
            <div className="profilePreview">
              <div className="previewTop">
                <div>
                  <span className="previewKicker">Livebaserat resultat</span>
                  <h2>Aktuella utbildningar</h2>
                </div>
                <div className="scoreOrb">92</div>
              </div>

              {[
                ["Intressen & ämnesspår", 91],
                ["Studie- och arbetssätt", 88],
                ["Motivation & värderingar", 76],
                ["Praktiska krav", 71],
              ].map(([label, value]) => (
                <div className="previewBar" key={label}>
                  <div><span>{label}</span><strong>{value}%</strong></div>
                  <div className="miniTrack"><div className="miniFill" style={{ width: `${value}%` }} /></div>
                </div>
              ))}

              <div className="previewMatch">
                <span>Exempel på matchning</span>
                <strong>Program från Susa-navet</strong>
                <em>94% match</em>
              </div>
            </div>

            <div className="floatingCard floatingA">
              <span>02</span>
              <strong>Jämför lärosäten</strong>
              <small>ort, start & studietakt</small>
            </div>
            <div className="floatingCard floatingB">
              <span>03</span>
              <strong>Öppna originalkälla</strong>
              <small>kontrollera behörighet</small>
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
            en adaptiv matchning som både fördjupar starka signaler och testar alternativ som kan passa bättre.
          </p>
        </div>

        <div className="stepGrid">
          <article className="stepCard">
            <span className="stepNo">01</span>
            <h3>Välj tempo</h3>
            <p>Snabbkompassen ger en snabb riktning med 15–20 frågor. Djupkompassen går längre med 40–60 frågor och fler jämförelser.</p>
          </article>
          <article className="stepCard featuredStep">
            <span className="stepNo">02</span>
            <h3>Frågorna anpassas</h3>
            <p>Motorn väljer nästa fråga efter dina svar: ibland fördjupning, ibland utslagsfrågor och ibland frågor som utmanar den nuvarande hypotesen.</p>
          </article>
          <article className="stepCard">
            <span className="stepNo">03</span>
            <h3>Matchas mot liveutbildningar</h3>
            <p>Resultatet poängsätter aktuella utbildningar från livekatalogen och visar varför de hamnar högt, med länkar till originalkällan.</p>
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
            <p>Du får adaptiva frågor, transparenta delpoäng och tydligare vägar vidare till utbildningar som finns i det aktuella utbudet.</p>
          </div>
          <div className="ctaButtonStack">
            <Link href="/kompass" className="button buttonLarge">Starta Högskolekompassen →</Link>
            <Link href="/utbildningar" className="textButton">Utforska utbildningar</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
