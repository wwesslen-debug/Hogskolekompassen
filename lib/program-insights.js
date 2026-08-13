const AREA_INFO = {
  "Arkitektur & Samhällsbyggnad": {
    description: "Kombinerar form, teknik och utveckling av byggda miljöer.",
    careers: ["arkitektur och gestaltning", "samhällsplanering", "bygg- och fastighetsutveckling", "projektledning"],
  },
  "Bioteknik & Livsvetenskap": {
    description: "För dig som vill förstå och använda biologiska system inom exempelvis läkemedel, industri och forskning.",
    careers: ["bioteknik och life science", "laboratorie- och processutveckling", "läkemedelsbranschen", "forskning och utveckling"],
  },
  "Design & Kommunikation": {
    description: "Kreativa utbildningar där idé, form, medier och kommunikation står i centrum.",
    careers: ["design och kreativa roller", "kommunikation och media", "innehåll och varumärke", "digital produktion"],
  },
  "Djur, Lantbruk & Skog": {
    description: "Utbildningar kopplade till djur, naturresurser, livsmedel, skog och hållbar markanvändning.",
    careers: ["djur- och naturverksamhet", "lantbruk och livsmedel", "skog och naturresurser", "rådgivning och hållbarhet"],
  },
  "Ekonomi & Management": {
    description: "Affär, organisation, ekonomi och ledning – ofta med stark koppling till analys och beslutsfattande.",
    careers: ["ekonomi och finans", "management och verksamhetsutveckling", "analys och konsulting", "entreprenörskap"],
  },
  "Humaniora & Språk": {
    description: "Språk, kultur, historia, idéer och människans sätt att skapa mening och kommunicera.",
    careers: ["språk och kommunikation", "kultur och offentlig verksamhet", "analys och utredning", "redaktionellt arbete"],
  },
  "Idrott & Hälsa": {
    description: "Rörelse, prestation, ledarskap och hälsa i praktiska och vetenskapliga sammanhang.",
    careers: ["idrott och träning", "hälsopromotion", "coachning och ledarskap", "idrottsorganisationer"],
  },
  "Juridik & Rättsvetenskap": {
    description: "Rättsregler, argumentation och analys av hur lagar används i samhälle och organisationer.",
    careers: ["juridiskt arbete", "myndigheter och offentlig sektor", "compliance och utredning", "avtal och rådgivning"],
  },
  "Miljö & Hållbarhet": {
    description: "Naturvetenskap, samhälle och omställning med fokus på klimat, resurser och hållbar utveckling.",
    careers: ["miljö- och hållbarhetsarbete", "klimat och energi", "utredning och analys", "hållbar verksamhetsutveckling"],
  },
  "Musik & Scenkonst": {
    description: "Konstnärligt skapande, sceniskt arbete och fördjupning inom musik och performance.",
    careers: ["musik och scenkonst", "produktion och skapande", "kulturverksamhet", "pedagogiskt konstnärligt arbete"],
  },
  "Naturvetenskap": {
    description: "Matematik och naturvetenskap för dig som vill förstå världen genom modeller, experiment och analys.",
    careers: ["forskning och utveckling", "laboratorium och analys", "data- och modellarbete", "tekniska specialistroller"],
  },
  "Pedagogik & Lärare": {
    description: "Lärande, utveckling och kommunikation med människor i olika åldrar och sammanhang.",
    careers: ["undervisning", "pedagogiskt utvecklingsarbete", "utbildningsorganisationer", "handledning och lärande"],
  },
  "Psykologi & Beteende": {
    description: "Människors beteende, relationer, organisationer och psykologiska processer.",
    careers: ["beteende- och organisationsfrågor", "HR och arbetsliv", "utredning och analys", "människonära verksamheter"],
  },
  "Samhälle & Politik": {
    description: "Samhällsfrågor, politik, organisation, internationella relationer och offentlig verksamhet.",
    careers: ["utredning och policy", "offentlig sektor", "organisationer och samhällsanalys", "internationellt arbete"],
  },
  "Säkerhet & Krishantering": {
    description: "Risk, beredskap, säkerhet och ledning när organisationer och samhällen utsätts för störningar.",
    careers: ["säkerhet och beredskap", "riskhantering", "krisledning", "myndigheter och samhällsskydd"],
  },
  "Teknik & IT": {
    description: "Tekniska och digitala utbildningar inom allt från programmering och AI till ingenjörsvetenskap.",
    careers: ["system- och mjukvaruutveckling", "ingenjörsroller", "data och AI", "teknisk produkt- och verksamhetsutveckling"],
  },
  "Transport & Sjöfart": {
    description: "Teknik, logistik, drift och ansvar i transport- och sjöfartssystem.",
    careers: ["transport och logistik", "sjöfart och drift", "planering och ledning", "tekniska operativa roller"],
  },
  "Turism, Mat & Service": {
    description: "Service, upplevelser, turism, gastronomi och verksamheter där människor står i centrum.",
    careers: ["turism och besöksnäring", "service och hospitality", "mat och gastronomi", "event och verksamhetsledning"],
  },
  "Vård & Hälsa": {
    description: "Människonära utbildningar med fokus på hälsa, vård, diagnostik, behandling och prevention.",
    careers: ["hälso- och sjukvård", "rehabilitering och prevention", "diagnostik och behandling", "vårdutveckling och forskning"],
  },
};

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function level(value) {
  const v = clamp(value);
  if (v >= 0.82) return "Mycket hög";
  if (v >= 0.66) return "Hög";
  if (v >= 0.48) return "Medel";
  if (v >= 0.31) return "Låg–medel";
  return "Låg";
}

function labIntensity(program) {
  const text = `${program.title} ${(program.tags || []).join(" ")} ${program.category}`.toLowerCase();
  if (/biotek|biokemi|molekyl|kemi|biomed|laborator|farmaci|apotek/.test(text)) return 0.88;
  if (/biologi|naturvet|fysik|geologi|miljövet/.test(text)) return 0.7;
  if (/läkare|tandläk|veterin|sjuksköters|fysioter|arbetster/.test(text)) return 0.55;
  if (/civilingenjör|ingenjör|teknik/.test(text)) return 0.35;
  return 0.12;
}

function contentItems(program) {
  const tags = (program.tags || []).filter(Boolean).slice(0, 5);
  if (tags.length >= 3) return tags;
  const fallbacks = {
    "Teknik & IT": ["tekniska system", "problemlösning", "projektarbete"],
    "Bioteknik & Livsvetenskap": ["biologi", "kemi", "laborativa metoder"],
    "Ekonomi & Management": ["ekonomi", "organisation", "analys"],
    "Vård & Hälsa": ["hälsa", "människan", "professionell praktik"],
    "Naturvetenskap": ["vetenskaplig metod", "analys", "naturvetenskap"],
    "Juridik & Rättsvetenskap": ["rättsvetenskap", "argumentation", "juridisk metod"],
  };
  return [...tags, ...(fallbacks[program.category] || ["ämnesfördjupning", "analys", "projektarbete"])].slice(0, 5);
}

export function enrichProgram(program) {
  const vector = program.vector || {};
  const lab = labIntensity(program);
  const theory = clamp(vector.teori);
  const practical = clamp(vector.praktik);
  const style = theory - practical > 0.18
    ? "Teoretisk"
    : practical - theory > 0.18
      ? "Tillämpad"
      : "Blandad";

  return {
    ...program,
    areaDescription: AREA_INFO[program.category]?.description || "Ett utbildningsområde med flera möjliga inriktningar.",
    contentItems: contentItems(program),
    careerExamples: AREA_INFO[program.category]?.careers || ["specialistroller", "analys och utveckling", "projektarbete"],
    studyProfile: {
      math: clamp(vector.matematik),
      programming: clamp(vector.programmering),
      theory,
      people: clamp(vector.manniskor),
      practical,
      communication: clamp(vector.kommunikation),
      leadership: clamp(vector.ledarskap),
      lab,
    },
    studySummary: {
      math: level(vector.matematik),
      programming: level(vector.programmering),
      theory: level(vector.teori),
      people: level(vector.manniskor),
      practical: level(vector.praktik),
      communication: level(vector.kommunikation),
      leadership: level(vector.ledarskap),
      lab: level(lab),
      style,
    },
  };
}

export function getAreaInfo(category) {
  return AREA_INFO[category] || {
    description: "Ett brett utbildningsområde med flera möjliga vägar.",
    careers: ["specialistroller", "analys och utveckling", "projektarbete"],
  };
}

export function getAllAreaInfo() {
  return Object.entries(AREA_INFO).map(([category, info]) => ({ category, ...info }));
}
