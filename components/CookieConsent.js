"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  useConsentState,
  writeConsent,
} from "@/lib/consent-client";

export default function CookieConsent() {
  const [consent] = useConsentState();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [choices, setChoices] = useState({ analytics: false, ads: false });

  useEffect(() => {
    const latest = readConsent();
    setChoices({ analytics: latest.analytics, ads: latest.ads });
    setVisible(!latest.decided);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setChoices({ analytics: consent.analytics, ads: consent.ads });
    if (!consent.decided) setVisible(true);
  }, [consent.analytics, consent.ads, consent.decided, ready]);

  useEffect(() => {
    const open = () => {
      const latest = readConsent();
      setChoices({ analytics: latest.analytics, ads: latest.ads });
      setVisible(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  if (!visible) return null;

  function save(nextChoices) {
    writeConsent({
      analytics: Boolean(nextChoices.analytics),
      ads: Boolean(nextChoices.ads),
    });
    setVisible(false);
  }

  return (
    <div className="cookieConsent" role="dialog" aria-modal="true" aria-labelledby="cookieConsentTitle">
      <div className="cookieConsentPanel">
        <div className="cookieConsentCopy">
          <span className="eyebrow">Integritet</span>
          <h2 id="cookieConsentTitle">Samtycke för kakor och lagring</h2>
          <p>
            Nödvändig lokal lagring används för resultat, jämförelser och Min väg. Analyscookies och annonscookies
            kräver samtycke. Utan samtycke till annonscookies laddas inte Google AdSense.
          </p>
        </div>

        <div className="cookieConsentOptions">
          <label className="cookieChoice disabled">
            <input type="checkbox" checked disabled />
            <span><strong>Nödvändigt</strong><small>Behövs för att sidan ska fungera och för att spara dina egna val lokalt.</small></span>
          </label>
          <label className="cookieChoice">
            <input
              type="checkbox"
              checked={choices.analytics}
              onChange={(event) => setChoices((current) => ({ ...current, analytics: event.target.checked }))}
            />
            <span><strong>Analys</strong><small>Enkla användningshändelser utan råa quizsvar eller fullständiga resultat.</small></span>
          </label>
          <label className="cookieChoice">
            <input
              type="checkbox"
              checked={choices.ads}
              onChange={(event) => setChoices((current) => ({ ...current, ads: event.target.checked }))}
            />
            <span><strong>Annonscookies</strong><small>Används för att ladda Google AdSense och kan innebära tredjepartskakor.</small></span>
          </label>
        </div>

        <div className="cookieConsentActions">
          <button type="button" className="button buttonGhost" onClick={() => save({ analytics: false, ads: false })}>
            Endast nödvändiga
          </button>
          <button type="button" className="button buttonGhost" onClick={() => save(choices)}>
            Spara val
          </button>
          <button type="button" className="button buttonGhost" onClick={() => save({ analytics: true, ads: true })}>
            Godkänn alla kakor
          </button>
        </div>
      </div>
    </div>
  );
}
