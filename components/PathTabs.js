import Link from "next/link";

export default function PathTabs({ active = "path" }) {
  return (
    <nav className="pathTabs" aria-label="Min väg-flikar">
      <Link href="/min-vag" aria-current={active === "path" ? "page" : undefined}>
        Min väg
      </Link>
      <Link href="/resultat" aria-current={active === "result" ? "page" : undefined}>
        Mitt resultat
      </Link>
    </nav>
  );
}
