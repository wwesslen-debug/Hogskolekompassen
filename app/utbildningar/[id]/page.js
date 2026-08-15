import { notFound } from "next/navigation";
import ProgramDetail from "@/components/ProgramDetail";
import { getLiveOfferingsForProgram, getProgramById, getPrograms, getRelatedPrograms } from "@/lib/db";
import { canonicalUrl, cleanDescription, siteName } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolved = await params;
  const program = getProgramById(resolved?.id);
  if (!program) {
    return {
      title: "Utbildningen hittades inte",
      robots: { index: false, follow: false },
    };
  }

  const title = `${program.title} – ${program.institution}`;
  const description = cleanDescription(
    `${program.description} Jämför studieprofil, karriärspår och länkar vidare till officiell information.`,
    155
  );
  const url = canonicalUrl(`/utbildningar/${program.id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName,
      title,
      description,
    },
  };
}

export async function generateStaticParams() {
  return getPrograms({ limit: 1000 }).map((program) => ({ id: String(program.id) }));
}

export default async function ProgramPage({ params }) {
  const resolved = await params;
  const program = getProgramById(resolved?.id);
  if (!program) notFound();
  const related = getRelatedPrograms(program, 6);
  const liveOfferings = getLiveOfferingsForProgram(program.id, 12);
  return <ProgramDetail program={program} related={related} liveOfferings={liveOfferings} />;
}
