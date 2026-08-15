import CareerExplorer from "@/components/CareerExplorer";
import { getAllAreaInfo } from "@/lib/program-insights";
import { canonicalUrl } from "@/lib/site";

export const metadata = {
  title: "Karriärspår",
  description: "Utforska breda arbetsområden och vilka utbildningsområden som kan leda dit.",
  alternates: { canonical: canonicalUrl("/karriar") },
};

export default function CareersPage() {
  return (
    <main className="careerPage">
      <section className="shell careerHero">
        <span className="eyebrow">Utbildning → arbetsliv</span>
        <h1>Utforska möjliga karriärspår.</h1>
        <p className="lead">Börja i andra änden: vilka typer av arbetsområden lockar dig? Exemplen är breda vägvisare, inte garantier om ett visst yrke.</p>
      </section>
      <section className="shell careerSection">
        <CareerExplorer areas={getAllAreaInfo()} />
      </section>
    </main>
  );
}
