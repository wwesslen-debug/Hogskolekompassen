import { educationCategoryPages, getEducationCategoryPath } from "@/lib/education-categories";
import { canonicalUrl, siteName } from "@/lib/site";

export const educationCityPages = [
  {
    slug: "stockholm",
    city: "Stockholm",
    title: "Utbildningar i Stockholm",
    metaDescription:
      "Jämför aktuella högskoleutbildningar i Stockholm. Se program, lärosäten, studietakt och hitta utbildningar som passar dig.",
    intro:
      "Stockholm har ett stort utbud av universitet, högskolor och programstarter. Här kan du börja i orten, jämföra aktuella utbildningar och sedan gå vidare till detaljsidor och originalkällor.",
  },
  {
    slug: "goteborg",
    aliases: ["göteborg"],
    city: "Göteborg",
    title: "Utbildningar i Göteborg",
    metaDescription:
      "Hitta och jämför aktuella högskoleutbildningar i Göteborg. Filtrera program, lärosäten, studietakt och studieform.",
    intro:
      "Göteborg samlar många utbildningsvägar inom teknik, vård, ekonomi, samhälle, design och naturvetenskap. Sidan visar aktuella programstarter i livekatalogen när de finns tillgängliga.",
  },
  {
    slug: "malmo",
    aliases: ["malmö"],
    city: "Malmö",
    title: "Utbildningar i Malmö",
    metaDescription:
      "Utforska högskoleutbildningar i Malmö. Jämför aktuella programstarter, lärosäten, omfattning och studieform.",
    intro:
      "Malmö passar dig som vill studera i en större studentstad med närhet till både Skåne och Öresundsregionen. Här samlas aktuella utbildningar från livekatalogen.",
  },
  {
    slug: "uppsala",
    city: "Uppsala",
    title: "Utbildningar i Uppsala",
    metaDescription:
      "Jämför aktuella högskoleutbildningar i Uppsala. Se program, lärosäte, studietakt och länkar till originalkällor.",
    intro:
      "Uppsala är en klassisk studentstad med många breda och ämnesfördjupande utbildningar. Här kan du hitta aktuella programstarter och jämföra dem med andra alternativ.",
  },
  {
    slug: "lund",
    city: "Lund",
    title: "Utbildningar i Lund",
    metaDescription:
      "Hitta högskoleutbildningar i Lund och jämför programstarter, lärosäten, studietakt och studieform.",
    intro:
      "Lund har ett brett utbud av utbildningar inom bland annat teknik, naturvetenskap, ekonomi, samhälle och humaniora. Sidan hjälper dig börja med orten och sedan smalna av.",
  },
];

const guideLinkSet = [
  { label: "Vilken utbildning passar mig?", href: "/vilken-utbildning-passar-mig" },
  { label: "Vad ska jag plugga?", href: "/vad-ska-jag-plugga" },
  { label: "Hitta utbildning", href: "/hitta-utbildning" },
  { label: "Jämför universitetsutbildningar", href: "/jamfor-universitetsutbildningar" },
  { label: "Utbildningar med höga löner", href: "/universitetsutbildningar-med-hoga-loner" },
  { label: "Utbildningar utan matte 3", href: "/utbildningar-utan-matte-3" },
];

const categoryLinks = [
  "teknik-it",
  "ekonomi",
  "psykologi",
  "vard",
  "juridik",
  "samhalle-politik",
].map((slug) => {
  const category = educationCategoryPages.find((item) => item.slug === slug);
  return category ? { label: category.label, href: getEducationCategoryPath(category) } : null;
}).filter(Boolean);

export const seoGuidePages = [
  {
    slug: "vilken-utbildning-passar-mig",
    path: "/vilken-utbildning-passar-mig",
    title: "Vilken utbildning passar mig?",
    metaTitle: "Vilken utbildning passar mig? Testa och jämför utbildningar",
    metaDescription:
      "Osäker på vilken utbildning som passar dig? Gör Högskolekompassen, förstå din studieprofil och jämför aktuella utbildningar.",
    eyebrow: "Utbildningsval",
    lead:
      "När du undrar vilken utbildning som passar dig behöver du mer än en lista med program. Du behöver förstå hur dina intressen, ditt arbetssätt och dina praktiska krav möter riktiga utbildningar.",
    primaryCta: { label: "Gör Högskolekompassen", href: "/kompass" },
    secondaryCta: { label: "Utforska utbildningar", href: "/utbildningar" },
    highlights: [
      "Matcha intressen och studiestil mot utbildningar.",
      "Jämför flera alternativ innan du bestämmer dig.",
      "Kontrollera alltid behörighet hos lärosätet eller Antagning.se.",
    ],
    sections: [
      {
        title: "Börja med hur du vill arbeta",
        body:
          "Många börjar med ämnen, men utbildningsval blir ofta tydligare om du också tänker på arbetsvardagen. Vill du analysera, bygga, hjälpa, organisera, skapa, forska eller kommunicera? Högskolekompassen väger flera sådana signaler samtidigt.",
      },
      {
        title: "Titta på både innehåll och krav",
        body:
          "Två utbildningar med liknande namn kan skilja sig mycket i matematik, praktik, grupparbete, teori, examen och framtida roller. Därför bör du öppna detaljsidorna och jämföra fakta, inte bara rubriker.",
      },
      {
        title: "Spara flera möjliga vägar",
        body:
          "Ett bra utbildningsval är sällan ett enda perfekt svar. Spara några starka alternativ, jämför dem sida vid sida och använd originalkällorna för slutlig kontroll.",
      },
    ],
    faq: [
      ["Hur vet jag vilken utbildning som passar mig?", "Börja med intressen, arbetssätt, ämnen du orkar fördjupa dig i och praktiska krav som ort, studietakt och behörighet. Testet hjälper dig väga ihop flera sådana faktorer."],
      ["Är testet ett facit?", "Nej. Det är ett beslutsstöd som ger riktning och förslag. Du ska alltid kontrollera innehåll, behörighet och ansökan hos officiell källa."],
      ["Kan jag jämföra utbildningar efter testet?", "Ja, du kan spara utbildningar och jämföra dem för att se skillnader i upplägg, lärosäte och matchning."],
    ],
    relatedLinks: [...guideLinkSet.slice(1), ...categoryLinks],
  },
  {
    slug: "vad-ska-jag-plugga",
    path: "/vad-ska-jag-plugga",
    title: "Vad ska jag plugga?",
    metaTitle: "Vad ska jag plugga? Hitta utbildning efter intresse och mål",
    metaDescription:
      "Få hjälp att välja vad du ska plugga. Jämför utbildningsområden, gör kompassen och hitta aktuella högskoleutbildningar.",
    eyebrow: "Studieval",
    lead:
      "Frågan vad ska jag plugga blir enklare när du bryter ner den i intresse, ämnesnivå, studieform, behörighet och vad du vill att utbildningen ska leda till.",
    primaryCta: { label: "Starta testet", href: "/kompass" },
    secondaryCta: { label: "Se utbildningsområden", href: "/utbildningar" },
    highlights: [
      "Utgå från både nyfikenhet och vardagen du vill ha.",
      "Jämför breda områden innan du låser dig vid ett program.",
      "Använd livekatalogen för att hitta aktuella starter.",
    ],
    sections: [
      {
        title: "Välj inte bara efter favoritämne",
        body:
          "Ett favoritämne kan vara en bra start, men det räcker inte alltid. Fundera också på om du vill ha mycket teori, praktik, matematik, kommunikation, analys, kreativ produktion eller arbete nära människor.",
      },
      {
        title: "Skapa en kortlista",
        body:
          "När du har hittat några områden som känns rimliga kan du spara utbildningar och jämföra dem. Det gör valet mer konkret och minskar risken att allt känns lika stort.",
      },
      {
        title: "Gå från osäkerhet till nästa steg",
        body:
          "Du behöver inte veta exakt från början. Börja brett, låt kompassen ge förslag och fördjupa dig sedan i de utbildningar som verkar mest relevanta.",
      },
    ],
    faq: [
      ["Vad ska jag plugga om jag inte vet vad jag vill bli?", "Börja med breda utbildningsområden och vad du tycker om att göra. Många utbildningar kan leda till flera olika roller."],
      ["Ska jag välja efter jobb eller intresse?", "Båda spelar roll. Ett hållbart val brukar behöva både motivation under studierna och rimliga vägar vidare efter examen."],
      ["Kan jag hitta utbildningar per ort?", "Ja. Du kan söka i katalogen och använda ortssidor som Stockholm, Göteborg, Malmö, Uppsala och Lund."],
    ],
    relatedLinks: guideLinkSet.filter((item) => item.href !== "/vad-ska-jag-plugga").concat(categoryLinks),
  },
  {
    slug: "hitta-utbildning",
    path: "/hitta-utbildning",
    title: "Hitta utbildning",
    metaTitle: "Hitta utbildning - sök och jämför högskoleutbildningar",
    metaDescription:
      "Hitta utbildning bland aktuella svenska högskoleprogram. Sök, filtrera, spara och jämför utbildningar från livekatalogen.",
    eyebrow: "Sök utbildning",
    lead:
      "Högskolekompassen hjälper dig hitta utbildning genom att kombinera sök, filter, utbildningsområden, orter och personliga matchningar.",
    primaryCta: { label: "Sök i katalogen", href: "/utbildningar" },
    secondaryCta: { label: "Gör kompassen", href: "/kompass" },
    highlights: [
      "Sök på program, ämne, lärosäte eller ort.",
      "Filtrera efter starttermin, studieform och ansökningsläge.",
      "Öppna originalkällan innan du söker.",
    ],
    sections: [
      {
        title: "Sök brett först",
        body:
          "Testa både ämnesord och yrkesnära ord. Om du söker ekonomi kan du också prova företagsekonomi, finans, marknadsföring eller management.",
      },
      {
        title: "Använd områdessidorna",
        body:
          "Om du inte vet exakt programnamn kan kategorisidor som teknik och IT, ekonomi, psykologi eller vård ge en bättre startpunkt.",
      },
      {
        title: "Jämför innan du ansöker",
        body:
          "När du hittar utbildningar som verkar intressanta bör du jämföra omfattning, studietakt, ort, behörighet och länkar till lärosätets egen information.",
      },
    ],
    faq: [
      ["Hur hittar jag rätt utbildning?", "Börja med ett brett område, filtrera efter praktiska krav och jämför sedan några program mer noggrant."],
      ["Varifrån kommer utbildningsdatan?", "Liveutbildningarna hämtas från Susa-navet via Supabase och länkar vidare till originalkällor när de finns."],
      ["Kan jag spara utbildningar?", "Ja, du kan spara utbildningar till din egen kortlista och jämföra dem senare."],
    ],
    relatedLinks: guideLinkSet.filter((item) => item.href !== "/hitta-utbildning").concat(categoryLinks),
  },
  {
    slug: "jamfor-universitetsutbildningar",
    path: "/jamfor-universitetsutbildningar",
    title: "Jämför universitetsutbildningar",
    metaTitle: "Jämför universitetsutbildningar - program, ort och upplägg",
    metaDescription:
      "Jämför universitetsutbildningar och högskoleprogram sida vid sida. Se skillnader i innehåll, ort, studietakt och matchning.",
    eyebrow: "Jämför utbildningar",
    lead:
      "Utbildningar som låter lika kan ha olika upplägg, krav och vägar vidare. Därför är jämförelse ofta det viktigaste steget innan du väljer.",
    primaryCta: { label: "Öppna jämförelsen", href: "/jamfor" },
    secondaryCta: { label: "Hitta utbildningar", href: "/utbildningar" },
    highlights: [
      "Jämför upp till tre utbildningar.",
      "Se ort, studietakt, nivå och ansökningsläge.",
      "Använd kompassen för personlig matchning.",
    ],
    sections: [
      {
        title: "Jämför mer än namnet",
        body:
          "Programnamn säger inte allt. Kontrollera utbildningens inriktning, praktik, valbara kurser, matematiknivå, examen och om programmet är campus, distans eller blandat.",
      },
      {
        title: "Väg praktiska krav mot innehåll",
        body:
          "En utbildning kan vara perfekt ämnesmässigt men svår praktiskt om ort, tempo eller behörighet inte passar. Jämförelsen hjälper dig se sådant tidigt.",
      },
      {
        title: "Gå vidare till originalkällan",
        body:
          "Högskolekompassen är en väg in. Det slutliga beslutet ska alltid dubbelkollas hos lärosätet och andra officiella källor.",
      },
    ],
    faq: [
      ["Vad ska jag jämföra mellan utbildningar?", "Börja med innehåll, behörighet, studietakt, studieort, examen, praktik och hur väl utbildningen passar din profil."],
      ["Kan jag jämföra utbildningar från olika lärosäten?", "Ja, du kan spara utbildningar från olika lärosäten och jämföra dem sida vid sida."],
      ["Är universitetsutbildningar och högskoleutbildningar samma sak?", "Båda kan vara akademiska utbildningar, men lärosäte, examen och upplägg kan skilja sig. Läs alltid programmets egen information."],
    ],
    relatedLinks: guideLinkSet.filter((item) => item.href !== "/jamfor-universitetsutbildningar").concat(categoryLinks),
  },
  {
    slug: "universitetsutbildningar-med-hoga-loner",
    path: "/universitetsutbildningar-med-hoga-loner",
    title: "Universitetsutbildningar med höga löner",
    metaTitle: "Universitetsutbildningar med höga löner - områden att jämföra",
    metaDescription:
      "Utforska utbildningsområden som ofta kopplas till starka löneutsikter och jämför aktuella program inom teknik, IT, ekonomi och naturvetenskap.",
    eyebrow: "Utbildning och arbetsliv",
    lead:
      "Om lön är en viktig faktor bör du jämföra utbildningsområden, arbetsmarknad och behörighet innan du väljer. Högskolekompassen hjälper dig hitta relevanta program att undersöka vidare.",
    primaryCta: { label: "Jämför utbildningar", href: "/jamfor" },
    secondaryCta: { label: "Se teknik och IT", href: "/utbildningar/teknik-it" },
    highlights: [
      "Börja med områden där kompetensen ofta är efterfrågad.",
      "Väg lön mot intresse, studiemiljö och arbetsvardag.",
      "Kontrollera aktuell arbetsmarknads- och lönestatistik separat.",
    ],
    sections: [
      {
        title: "Områden många börjar med",
        body:
          "Teknik, IT, data, ekonomi, naturvetenskap och vissa professionsutbildningar är vanliga startpunkter för den som söker utbildningar med starka framtidsutsikter. Exakta löner varierar med roll, bransch, region och erfarenhet.",
      },
      {
        title: "Hög lön räcker inte som urval",
        body:
          "En utbildning behöver också passa hur du vill tänka och arbeta. Matematik, programmering, analys, ansvar och tempo kan skilja sig mycket mellan olika högskoleprogram.",
      },
      {
        title: "Jämför riktiga program",
        body:
          "Använd kategorisidorna för att hitta aktuella programstarter och jämför flera alternativ innan du går vidare till lärosätets egen information.",
      },
    ],
    faq: [
      ["Vilka utbildningar ger högst lön?", "Det varierar över tid och mellan roller. Teknik, IT, ekonomi och vissa professionsspår är vanliga områden att undersöka, men kontrollera alltid aktuell statistik."],
      ["Ska jag välja utbildning efter lön?", "Lön kan vara en faktor, men ett bra val bör också passa dina intressen, styrkor, behörighet och den arbetsvardag du vill ha."],
      ["Har Högskolekompassen lönedata?", "Sidan hjälper dig hitta och jämföra utbildningar. Exakt lönestatistik bör kontrolleras hos separata statistik- och branschkällor."],
    ],
    relatedLinks: [
      { label: "Teknik & IT", href: "/utbildningar/teknik-it" },
      { label: "Ekonomi", href: "/utbildningar/ekonomi" },
      { label: "Naturvetenskap", href: "/utbildningar/naturvetenskap" },
      ...guideLinkSet.filter((item) => item.href !== "/universitetsutbildningar-med-hoga-loner"),
    ],
  },
  {
    slug: "utbildningar-utan-matte-3",
    path: "/utbildningar-utan-matte-3",
    title: "Utbildningar utan matte 3",
    metaTitle: "Utbildningar utan matte 3 - hitta alternativ att jämföra",
    metaDescription:
      "Letar du efter utbildningar utan matte 3? Hitta områden att börja med och kontrollera alltid behörighetskrav hos lärosätet.",
    eyebrow: "Behörighet",
    lead:
      "Många vill hitta utbildningar utan matte 3. Det går ofta att börja med breda områden, men behörighetskrav ändras och måste alltid kontrolleras hos lärosätet eller Antagning.se.",
    primaryCta: { label: "Sök utbildningar", href: "/utbildningar" },
    secondaryCta: { label: "Gör kompassen", href: "/kompass" },
    highlights: [
      "Börja brett och kontrollera kraven per program.",
      "Titta extra på humaniora, språk, kommunikation och samhällsspår.",
      "Läs alltid aktuell behörighet hos officiell källa.",
    ],
    sections: [
      {
        title: "Sök efter alternativ, inte genvägar",
        body:
          "Om du saknar matte 3 bör du leta efter program där dina styrkor ändå kommer fram. Det kan handla om text, språk, människor, samhälle, kommunikation, pedagogik eller vissa kreativa områden.",
      },
      {
        title: "Behörighet är programspecifik",
        body:
          "Två program inom samma område kan ha olika krav. Därför visar Högskolekompassen utbildningar och länkar vidare, men den slutliga behörigheten måste alltid kontrolleras hos originalkällan.",
      },
      {
        title: "Fundera på om du vill komplettera",
        body:
          "Ibland är rätt väg att välja ett annat program. Ibland är det värt att komplettera en kurs för att öppna fler utbildningar. Jämför båda alternativen innan du bestämmer dig.",
      },
    ],
    faq: [
      ["Finns det högskoleutbildningar utan matte 3?", "Ja, många utbildningar kräver inte matte 3, men kraven varierar mellan program och terminer. Kontrollera alltid behörigheten hos officiell källa."],
      ["Vilka områden kan jag börja med?", "Humaniora, språk, pedagogik, kommunikation, vissa samhällsvetenskapliga utbildningar och kreativa områden kan vara bra startpunkter att undersöka."],
      ["Kan Högskolekompassen filtrera exakt på matte 3?", "Inte som ett garanterat behörighetsfilter. Använd sidan för att hitta alternativ och dubbelkolla sedan kraven på programmens originalkällor."],
    ],
    relatedLinks: [
      { label: "Humaniora & språk", href: "/utbildningar/humaniora-sprak" },
      { label: "Design & kommunikation", href: "/utbildningar/design-kommunikation" },
      { label: "Samhälle & politik", href: "/utbildningar/samhalle-politik" },
      ...guideLinkSet.filter((item) => item.href !== "/utbildningar-utan-matte-3"),
    ],
  },
];

export function normalizeSeoSlug(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return "";
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function getSeoGuideBySlug(slug) {
  const normalized = normalizeSeoSlug(slug);
  return seoGuidePages.find((page) => page.slug === normalized) || null;
}

export function getEducationCityBySlug(slug) {
  const normalized = normalizeSeoSlug(slug);
  return educationCityPages.find((page) => (
    page.slug === normalized || page.aliases?.includes(normalized)
  )) || null;
}

export function getEducationCityPath(cityPage) {
  return cityPage?.slug ? `/utbildningar/${cityPage.slug}` : "/utbildningar";
}

export function getEducationCategoryCityPath(category, cityPage) {
  if (!category?.slug || !cityPage?.slug) return "/utbildningar";
  return `${getEducationCategoryPath(category)}/${cityPage.slug}`;
}

export function getSeoGuideMetadata(page) {
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: { canonical: canonicalUrl(page.path) },
    openGraph: {
      type: "website",
      url: canonicalUrl(page.path),
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      siteName,
      locale: "sv_SE",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function getPopularSeoLinks() {
  return [
    ...guideLinkSet,
    ...educationCityPages.slice(0, 4).map((cityPage) => ({
      label: cityPage.title,
      href: getEducationCityPath(cityPage),
    })),
    ...categoryLinks,
  ];
}
