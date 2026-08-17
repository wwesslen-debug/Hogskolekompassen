import traits from "@/data/traits.json";
import { scoreProgram } from "@/lib/matching";

const traitKeys = Object.keys(traits);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const SUBJECT_RULES = [
  {
    id: "tech-it",
    category: "Teknik & IT",
    pattern: /(data|datateknik|systemvetenskap|informatik|programmer|mjukvar|software|webb|digital|ai|artificiell|maskininlarning|cyber|it-sakerhet|spel|robot|automation|elektro|teknik|ingenjor)/,
    traits: { analys: 0.9, teknik: 0.92, matematik: 0.78, programmering: 0.82, struktur: 0.72, teori: 0.68, praktik: 0.58 },
    weight: 1.35,
  },
  {
    id: "engineering-built",
    category: "Arkitektur & Samhällsbyggnad",
    pattern: /(bygg|arkitekt|samhallsbygg|lantmateri|fastighet|stadsplan|planering|gis|geografisk information|infrastruktur)/,
    traits: { analys: 0.82, teknik: 0.76, kreativitet: 0.62, samhalle: 0.64, praktik: 0.68, struktur: 0.74, matematik: 0.62 },
    weight: 1.1,
  },
  {
    id: "business",
    category: "Ekonomi & Management",
    pattern: /(ekonomi|foretag|business|management|marknad|redovisning|finans|entrepren|organisation|logistik|industriell ekonomi|handel)/,
    traits: { affar: 0.9, analys: 0.78, ledarskap: 0.72, kommunikation: 0.64, struktur: 0.72, matematik: 0.58, samhalle: 0.52 },
    weight: 1.2,
  },
  {
    id: "health",
    category: "Vård & Hälsa",
    pattern: /(sjukskoters|lakare|medicin|vard|halsa|fysioter|arbetster|biomedicin|röntgen|rontgen|tand|farmaci|apotek|omvardnad)/,
    traits: { halsa: 0.94, manniskor: 0.82, praktik: 0.76, struktur: 0.78, kommunikation: 0.68, natur: 0.62, teori: 0.62 },
    weight: 1.3,
  },
  {
    id: "psychology-behavior",
    category: "Psykologi & Beteende",
    pattern: /(psykolog|psykologi|beteende|personalvet|hr|arbetsliv|sociologi|socialpsykologi|kognitiv)/,
    traits: { manniskor: 0.86, analys: 0.74, kommunikation: 0.74, samhalle: 0.7, teori: 0.7, struktur: 0.58 },
    weight: 1.15,
  },
  {
    id: "education",
    category: "Pedagogik & Lärare",
    pattern: /(larare|larar|pedagog|forskollarare|grundlarare|amneslarare|specialpedagog|undervisning|didaktik)/,
    traits: { manniskor: 0.86, kommunikation: 0.84, ledarskap: 0.76, struktur: 0.68, samhalle: 0.62, praktik: 0.72, teori: 0.58 },
    weight: 1.25,
  },
  {
    id: "law-society",
    category: "Juridik & Rättsvetenskap",
    pattern: /(jurid|ratt|lag|kriminologi|forvaltningsratt|affarsratt|compliance)/,
    traits: { samhalle: 0.86, analys: 0.84, struktur: 0.84, kommunikation: 0.78, teori: 0.76, manniskor: 0.54 },
    weight: 1.18,
  },
  {
    id: "society-politics",
    category: "Samhälle & Politik",
    pattern: /(statsvet|politik|samhall|internationell|global|fred|utveckling|offentlig|forvaltning|socialt arbete|socionom)/,
    traits: { samhalle: 0.9, manniskor: 0.74, analys: 0.72, kommunikation: 0.76, teori: 0.64, ledarskap: 0.58 },
    weight: 1.08,
  },
  {
    id: "natural-science",
    category: "Naturvetenskap",
    pattern: /(matematik|statistik|fysik|kemi|biologi|geologi|astronomi|naturvetenskap|molekyl|laborator|bioteknik|life science)/,
    traits: { natur: 0.92, analys: 0.86, matematik: 0.78, teori: 0.82, struktur: 0.74, praktik: 0.56 },
    weight: 1.22,
  },
  {
    id: "environment",
    category: "Miljö & Hållbarhet",
    pattern: /(miljo|hallbar|klimat|energi|ekologi|skog|lantbruk|agronom|djur|veterinar|landskap|naturresurs)/,
    traits: { natur: 0.86, samhalle: 0.7, analys: 0.7, praktik: 0.66, struktur: 0.62, halsa: 0.42 },
    weight: 1.05,
  },
  {
    id: "design-media",
    category: "Design & Kommunikation",
    pattern: /(design|form|konst|media|journalistik|kommunikation|grafisk|film|musik|scen|produktion|visuell|mode)/,
    traits: { kreativitet: 0.92, kommunikation: 0.82, manniskor: 0.58, teknik: 0.42, sjalvstandighet: 0.72, praktik: 0.62, teori: 0.48 },
    weight: 1.14,
  },
  {
    id: "humanities-language",
    category: "Humaniora & Språk",
    pattern: /(sprak|litteratur|historia|kultur|filosofi|religion|arkeologi|humaniora|oversatt|retorik)/,
    traits: { kommunikation: 0.86, kreativitet: 0.68, samhalle: 0.68, teori: 0.76, analys: 0.64, sjalvstandighet: 0.7 },
    weight: 1,
  },
  {
    id: "sports-service",
    category: "Idrott & Hälsa",
    pattern: /(idrott|sport|traning|coach|friluft|turism|service|hotell|maltid|gastronomi|restaurang|event)/,
    traits: { halsa: 0.72, manniskor: 0.72, praktik: 0.76, kommunikation: 0.68, ledarskap: 0.62, affar: 0.48 },
    weight: 0.95,
  },
  {
    id: "security",
    category: "Säkerhet & Krishantering",
    pattern: /(sakerhet|kris|beredskap|risk|skydd|polis|forsvar|brand|cybersakerhet)/,
    traits: { struktur: 0.84, samhalle: 0.76, ledarskap: 0.72, praktik: 0.68, analys: 0.74, teknik: 0.52 },
    weight: 1,
  },
];

const DEGREE_RULES = [
  { pattern: /(civilingenjor)/, traits: { langstudie: 0.92, matematik: 0.86, teknik: 0.9, teori: 0.82, struktur: 0.74 }, years: 5, weight: 0.9 },
  { pattern: /(hogskoleingenjor)/, traits: { langstudie: 0.56, matematik: 0.72, teknik: 0.86, praktik: 0.72, struktur: 0.72 }, years: 3, weight: 0.75 },
  { pattern: /(kandidat|candidate|bachelor)/, traits: { langstudie: 0.58, teori: 0.62, sjalvstandighet: 0.62 }, years: 3, weight: 0.48 },
  { pattern: /(yrkesexamen|sjukskoters|socionom|larare|forskollarare)/, traits: { praktik: 0.76, kommunikation: 0.72, struktur: 0.7, langstudie: 0.58 }, years: 3, weight: 0.55 },
];

function addSignals(state, traitsToAdd, weight) {
  for (const [key, value] of Object.entries(traitsToAdd || {})) {
    if (!traitKeys.includes(key)) continue;
    state.totals[key] += clamp(value) * weight;
    state.weights[key] += weight;
  }
}

function applyDirect(vector, key, value, strength = 0.55) {
  vector[key] = clamp(vector[key] * (1 - strength) + clamp(value) * strength);
}

function inferYears(offering, text) {
  const credits = Number(String(offering.credits || "").replace(",", "."));
  if (Number.isFinite(credits) && credits > 0) return Math.max(0.25, Math.round((credits / 60) * 10) / 10);
  if (/civilingenjor/.test(text)) return 5;
  if (/hogskoleingenjor|kandidat|sjukskoters|socionom|forskollarare|grundlarare|amneslarare/.test(text)) return 3;
  return 3;
}

function inferLabIntensity(text) {
  if (/(biomedicin|bioteknik|kemi|molekyl|laborator|farmaci|apotek)/.test(text)) return 0.88;
  if (/(biologi|naturvetenskap|fysik|geologi|miljo|lakare|sjukskoters|veterinar)/.test(text)) return 0.62;
  if (/(ingenjor|teknik|automation|energi)/.test(text)) return 0.32;
  return 0.12;
}

export function inferLiveProgramProfile(offering = {}) {
  const subjectCodes = Array.isArray(offering.subjectCodes) ? offering.subjectCodes.join(" ") : "";
  const text = normalizeText([
    offering.title,
    offering.description,
    offering.degree,
    offering.level,
    offering.eligibility,
    subjectCodes,
  ].join(" "));
  const titleText = normalizeText(offering.title);

  const state = {
    totals: Object.fromEntries(traitKeys.map((key) => [key, 0])),
    weights: Object.fromEntries(traitKeys.map((key) => [key, 0])),
  };
  const categoryScores = new Map();
  const evidence = [];
  let totalWeight = 0;

  for (const rule of SUBJECT_RULES) {
    if (!rule.pattern.test(text)) continue;
    const titleBoost = rule.pattern.test(titleText) ? 1.25 : 1;
    const weight = rule.weight * titleBoost;
    addSignals(state, rule.traits, weight);
    categoryScores.set(rule.category, (categoryScores.get(rule.category) || 0) + weight);
    evidence.push(rule.id);
    totalWeight += weight;
  }

  for (const rule of DEGREE_RULES) {
    if (!rule.pattern.test(text)) continue;
    addSignals(state, rule.traits, rule.weight);
    evidence.push("degree");
    totalWeight += rule.weight;
  }

  const vector = Object.fromEntries(traitKeys.map((key) => {
    if (!state.weights[key]) return [key, 0.5];
    return [key, Number((state.totals[key] / state.weights[key]).toFixed(4))];
  }));

  const years = inferYears(offering, text);
  if (years >= 4.5) applyDirect(vector, "langstudie", 0.9, 0.75);
  else if (years >= 3) applyDirect(vector, "langstudie", 0.58, 0.55);
  else applyDirect(vector, "langstudie", 0.34, 0.55);

  if (offering.distance) applyDirect(vector, "sjalvstandighet", 0.76, 0.48);
  if (/(distans|distance|online)/.test(text)) applyDirect(vector, "sjalvstandighet", 0.74, 0.4);
  if (/(praktik|verksamhetsforlagd|vfu|klinisk)/.test(text)) applyDirect(vector, "praktik", 0.8, 0.48);

  const category = [...categoryScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Brett utbildningsområde";
  const confidence = clamp(0.28 + Math.min(0.5, totalWeight * 0.09) + (categoryScores.size ? 0.08 : 0), 0.24, 0.86);

  return {
    title: offering.title || "Liveutbildning",
    category,
    degree: offering.degree || "Program",
    years,
    vector,
    studyProfile: {
      lab: inferLabIntensity(text),
    },
    inference: {
      confidence,
      evidence: evidence.slice(0, 6),
    },
  };
}

function normalizeSelectedIds(items) {
  return (items || [])
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

export function scoreLiveOfferingForProfile(offering, profileResult, options = {}) {
  const inferred = inferLiveProgramProfile(offering);
  const scoring = scoreProgram(
    profileResult.profile,
    inferred,
    profileResult.traitConfidence || {},
    normalizeSelectedIds(options.selectedPriorities),
    normalizeSelectedIds(options.selectedDealBreakers)
  );
  const inferredScore = Math.round(scoring.score * 100);
  const linkedScore = Number(options.scoreById?.[offering.canonicalProgramId] || 0);
  const linkScore = Number(offering.linkScore || 0);
  const hasLinkedScore = linkedScore > 0 && Number.isFinite(linkedScore);
  const linkWeight = hasLinkedScore
    ? linkScore >= 75 ? 0.68 : linkScore >= 55 ? 0.48 : 0.28
    : 0;
  const personalScore = hasLinkedScore
    ? Math.round(linkedScore * linkWeight + inferredScore * (1 - linkWeight))
    : inferredScore;
  const matchConfidence = clamp(Math.max(inferred.inference.confidence, hasLinkedScore ? linkScore / 100 : 0) * 100, 1, 99);
  const matchSource = hasLinkedScore ? "catalog_link_and_live_profile" : "live_profile";

  return {
    personalScore,
    inferredScore,
    linkedScore: hasLinkedScore ? linkedScore : null,
    matchConfidence: Math.round(matchConfidence),
    matchSource,
    matchLabel: Math.round(matchConfidence) >= 58 ? "din match" : "områdesmatch",
    inferredCategory: inferred.category,
    inferredEvidence: inferred.inference.evidence,
    scoreBreakdown: Object.fromEntries(
      Object.entries(scoring.breakdown).map(([key, value]) => [key, Math.round(value * 100)])
    ),
    dealBreakerPenalty: Math.round(scoring.dealBreakerPenalty * 100),
  };
}
