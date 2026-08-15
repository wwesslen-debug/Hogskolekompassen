import Link from "next/link";

export default function Header() {
  return (
    <header className="siteHeader">
      <div className="shell navShell">
        <Link href="/" className="brand" aria-label="Högskolekompassen startsida">
          <span className="brandMark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Högskolekompassen</span>
        </Link>
        <span className="betaBadge">Public beta</span>

        <nav className="mainNav" aria-label="Huvudnavigation">
          <Link href="/#hur">Så fungerar det</Link>
          <Link href="/utbildningar">Utbildningar</Link>
          <Link href="/aktuellt">Aktuellt utbud</Link>
          <Link href="/jamfor">Jämför</Link>
          <Link href="/datakalla">Datakälla</Link>
          <Link href="/min-vag">Min väg</Link>
          <Link href="/kompass" className="button buttonSmall">
            Starta kompassen
          </Link>
        </nav>
      </div>
    </header>
  );
}
