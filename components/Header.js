import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Header() {
  return (
    <header className="siteHeader">
      <div className="shell navShell">
        <Link href="/" className="brand" aria-label="Högskolekompassen startsida">
          <BrandMark />
          <span>Högskolekompassen</span>
        </Link>
        <nav className="mainNav" aria-label="Huvudnavigation">
          <Link href="/#hur">Så fungerar det</Link>
          <Link href="/utbildningar">Utbildningar</Link>
          <Link href="/jamfor">Jämför</Link>
          <Link href="/min-vag">Min väg</Link>
          <Link href="/kompass" className="button buttonSmall">
            Starta kompassen
          </Link>
        </nav>
      </div>
    </header>
  );
}
