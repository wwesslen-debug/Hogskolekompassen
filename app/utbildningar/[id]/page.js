import { notFound } from "next/navigation";
import ProgramDetail from "@/components/ProgramDetail";
import { getLiveOfferingsForProgram, getProgramById, getRelatedPrograms } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProgramPage({ params }) {
  const resolved = await params;
  const program = getProgramById(resolved?.id);
  if (!program) notFound();
  const related = getRelatedPrograms(program, 6);
  const liveOfferings = getLiveOfferingsForProgram(program.id, 12);
  return <ProgramDetail program={program} related={related} liveOfferings={liveOfferings} />;
}
