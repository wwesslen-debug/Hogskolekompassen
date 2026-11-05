import assert from "node:assert/strict";
import test from "node:test";
import { isLiveEntryProgram, liveEntryProgramSqlClause } from "./live-entry-programs.mjs";

const socialScienceRequirements = "Grundläggande behörighet. För vissa valfria eller valbara kurser och ämnen särskilda behörighetskrav. Du kan välja kurser eller ämnen där endast grundläggande behörighet krävs.";
const base = { school_type: "HS", kind: "program", level: "grund", title: "Kandidatprogram", degree: "Kandidatexamen" };
const cases = [
  ["enbart grundläggande behörighet", "Grundläggande behörighet", true],
  ["radbrytningar och blanksteg", "Grundläggande\n\t behörighet", true],
  ["HTML och hårda blanksteg", "<p>Grundl&auml;ggande&nbsp;<strong>beh&ouml;righet</strong></p>", true],
  ["osynliga avstavningar", "Grundläg\u00adgande behö\u200brighet", true],
  ["grundläggande högskolebehörighet", "Grundläggande högskolebehörighet", true],
  ["uttryckligen inga extra krav", "Grundläggande behörighet. Ingen särskild behörighet krävs.", true],
  ["tom rubrik för särskild behörighet", "Grundläggande behörighet. Särskild behörighet: Inga.", true],
  ["uttryckligen inget arbetsprov", "Grundläggande behörighet. Inga arbetsprov krävs.", true],
  ["engelsk formulering", "General eligibility. No specific entry requirements.", true],
  ["Umeås samhällsvetarprogram", socialScienceRequirements, true],
  ["samma valbara väg med annan formatering", socialScienceRequirements.replaceAll(" ", "\n"), true],
  ["ytterligare krav vid programstart", `Grundläggande behörighet + Matematik 2. ${socialScienceRequirements}`, false],
  ["arbetsprov vid programstart", `Grundläggande behörighet och godkänt arbetsprov. ${socialScienceRequirements}`, false],
  ["obligatoriska kurser har extra krav", "Grundläggande behörighet. Särskild behörighet krävs för obligatoriska kurser. Du kan välja kurser eller ämnen där endast grundläggande behörighet krävs.", false],
  ["programkrav i samma mening som valbara kurser", "Grundläggande behörighet. För vissa valfria kurser gäller särskild behörighet, men programmet kräver arbetsprov. Du kan välja kurser eller ämnen där endast grundläggande behörighet krävs.", false],
  ["ett villkor får inte läsas som en fullständig negation", "Grundläggande behörighet. Ingen särskild behörighet krävs utöver godkänt arbetsprov.", false],
  ["ingen bekräftad väg utan särskilda krav", "Grundläggande behörighet. För vissa valfria kurser krävs särskild behörighet.", false],
  ["negation följd av ett faktiskt krav", "Grundläggande behörighet. Ingen särskild behörighet krävs. Godkänt arbetsprov krävs.", false],
  ["KI:s arbetsterapeutprogram", "Grundläggande behörighet + Matematik 2a eller 2b eller 2c, Naturkunskap 2, Samhällskunskap 1b eller 1a1+1a2", false],
  ["KI:s läkarprogram", "Grundläggande behörighet + Biologi 2, Fysik 2, Kemi 2, Matematik 4 eller Matematik D", false],
  ["gymnasieämne enligt Gy25", "Grundläggande behörighet + Matematik – fortsättning nivå 1b", false],
  ["gymnasieämne med nivå", "Grundläggande behörighet + Naturkunskap nivå 2", false],
  ["äldre gymnasiekurs", "Grundläggande behörighet + Matematik B", false],
  ["högskolepoäng", "Grundläggande behörighet och 90 hp", false],
  ["tidigare examen", "Grundläggande behörighet och kandidatexamen", false],
  ["antagningsprov", "Grundläggande behörighet och godkänt antagningsprov", false],
  ["yrkeserfarenhet", "Grundläggande behörighet och yrkeserfarenhet", false],
  ["okända krav", null, false],
  ["tomma krav", "  ", false],
  ["en hänvisning bekräftar inte behörigheten", "Se lärosätets webbplats för behörighetskrav.", false],
  ["rekommenderade förkunskaper räcker inte", "grundlaggande", false],
  ["masterprogram", "Grundläggande behörighet", false, { title: "Masterprogram i historia" }],
  ["avancerad nivå", "Grundläggande behörighet", false, { level: "avancerad" }],
  ["senare del", "Grundläggande behörighet", false, { title: "Senare del av kandidatprogram" }],
  ["kompletterande utbildning", "Grundläggande behörighet", false, { title: "Kompletterande utbildning" }],
  ["fristående kurs", "Grundläggande behörighet", false, { kind: "course" }],
  ["annan skolform", "Grundläggande behörighet", false, { school_type: "YH" }],
];

for (const [name, eligibility, expected, overrides] of cases) {
  test(name, () => {
    assert.equal(isLiveEntryProgram({ ...base, eligibility, ...overrides }), expected);
  });
}

// Evaluate the generated WHERE clause as well as the JS predicate. SQLite only
// adapts Postgres's regex operators/functions; the filtering SQL is unchanged.
test("databasfiltret ger samma förväntade beslut, även med tabellalias", async (t) => {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch {
    t.skip("SQL-kontrollen kräver Node med node:sqlite; JS-fallen körs även på Node 20.");
    return;
  }
  const db = new DatabaseSync(":memory:");
  try {
    db.function("btrim", (value) => value.trim());
    db.function("translate", (value, from, to) => [...value].map((char) => {
      const index = [...from].indexOf(char);
      return index < 0 ? char : ([...to][index] || "");
    }).join(""));
    db.function("regexp_replace", (value, pattern, replacement, flags) => value.replace(new RegExp(pattern, flags), replacement));
    db.function("regexp", (pattern, value) => Number(new RegExp(pattern).test(value)));
    db.exec("CREATE TABLE offerings (school_type TEXT, kind TEXT, level TEXT, title TEXT, degree TEXT, eligibility TEXT)");
    const insert = db.prepare("INSERT INTO offerings VALUES (?, ?, ?, ?, ?, ?)");
    for (const alias of ["", "offering"]) {
      const clause = liveEntryProgramSqlClause({ alias }).replaceAll(" !~ ", " NOT REGEXP ").replaceAll(" ~ ", " REGEXP ");
      const query = db.prepare(`SELECT (${clause}) AS allowed FROM offerings ${alias}`);
      for (const [name, eligibility, expected, overrides] of cases) {
        const row = { ...base, eligibility, ...overrides };
        db.exec("DELETE FROM offerings");
        insert.run(row.school_type, row.kind, row.level, row.title, row.degree, row.eligibility);
        assert.equal(Boolean(query.get().allowed), expected, `${name} (alias: ${alias || "none"})`);
      }
    }
  } finally {
    db.close();
  }
});
