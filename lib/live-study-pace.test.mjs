import assert from "node:assert/strict";
import test from "node:test";
import { liveStudyPacePreferenceSqlClause } from "./live-study-pace.mjs";

test("50-procentsalternativ döljs bara när en motsvarande synlig heltidsstart finns", async (t) => {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import("node:sqlite")); }
  catch { t.skip("SQL-kontrollen kräver node:sqlite."); return; }
  const db = new DatabaseSync(":memory:");
  const columns = ["id", "title", "provider_name", "city", "period", "start_date", "kind", "level", "study_form", "language", "distance", "study_pace", "allowed"];
  db.function("lower", (value) => value?.toLocaleLowerCase("sv") ?? null);
  db.function("btrim", (value) => value.trim());
  db.function("regexp_replace", (value, pattern, replacement, flags) => value.replace(new RegExp(pattern.replaceAll("[[:space:]]", "\\s"), flags), replacement));
  db.function("regexp", (pattern, value) => Number(new RegExp(pattern).test(value)));
  db.exec(`CREATE TABLE susa_education_events (${columns.map((column) => `${column} ${["distance", "allowed"].includes(column) ? "INTEGER" : "TEXT"}`).join(", ")})`);
  const insert = db.prepare(`INSERT INTO susa_education_events VALUES (${columns.map(() => "?").join(", ")})`);
  const base = { title: "Musik- och ljuddesign", provider_name: "Mittuniversitetet", city: "SUNDSVALL", period: "VT 2027", start_date: "2027-01-18", kind: "program", level: "grund", study_form: "Distans", language: "svenska", distance: 1, allowed: 1 };
  const half = { ...base, id: "half", study_pace: "50 %" };
  const full = { ...base, id: "full", study_pace: "100 %" };
  const predicate = liveStudyPacePreferenceSqlClause({ eligibleFullTimeSql: "full_time_offering.allowed = 1" }).replaceAll(" ~ ", " REGEXP ");
  const select = db.prepare(`SELECT id FROM susa_education_events WHERE allowed = 1 AND (${predicate}) ORDER BY id`);
  function visible(rows) {
    db.exec("DELETE FROM susa_education_events");
    for (const row of rows) insert.run(...columns.map((name) => row[name] ?? null));
    return select.all().map(({ id }) => id);
  }
  try {
    assert.deepEqual(visible([half, full]), ["full"], "bildens exempel ska visa heltidsalternativet");
    assert.deepEqual(visible([half]), ["half"], "en ensam 50-procentsstart ska finnas kvar");
    assert.deepEqual(visible([{ ...half, study_pace: "50,0%" }, { ...full, study_pace: "100.00 %" }]), ["full"]);
    assert.deepEqual(visible([{ ...half, study_pace: "50\u00a0%" }, full]), ["full"]);
    assert.deepEqual(visible([{ ...half, study_pace: "75 %" }, full]), ["full", "half"], "andra studietakter ska behållas");
    assert.deepEqual(visible([{ ...half, study_pace: null }, full]), ["full", "half"], "okänd studietakt ska behållas");
    assert.deepEqual(visible([half, { ...full, allowed: 0 }]), ["half"], "en bortfiltrerad heltidsstart får inte dölja halvtidsstarten");
    assert.deepEqual(visible([half, { ...full, city: "Sundsvall" }]), ["full"], "skiftläge ska inte skapa dubbletter");
    for (const change of [
      { title: "Annan utbildning" }, { provider_name: "Högskolan Dalarna" }, { city: "Falun" },
      { start_date: "2027-08-30" }, { period: "HT 2027" }, { kind: "course" }, { level: "avancerad" },
      { study_form: "Campus", distance: 0 }, { language: "engelska" },
    ]) {
      assert.deepEqual(visible([half, { ...full, ...change }]), ["full", "half"], JSON.stringify(change));
    }
    for (const column of ["title", "provider_name", "start_date"]) {
      assert.deepEqual(visible([{ ...half, [column]: null }, { ...full, [column]: null }]), ["full", "half"], `saknad ${column} får inte antas vara samma utbildningsstart`);
    }
    visible([half, full]);
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM susa_education_events WHERE (${predicate})`).get().count, 1);
    assert.deepEqual(db.prepare(`SELECT id FROM susa_education_events WHERE id = 'half' AND (${predicate}) LIMIT 1`).all(), [], "heltidsjämförelsen ska göras före sidindelning och id-filter");
  } finally {
    db.close();
  }
});
