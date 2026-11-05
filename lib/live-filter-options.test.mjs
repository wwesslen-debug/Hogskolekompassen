import assert from "node:assert/strict";
import test from "node:test";
import { buildLiveFilterOptions, emptyLiveFilterOptions } from "./live-filter-options.mjs";

const rows = [
  { period: "HT 2027", city: "Umeå", provider: "Umeå universitet", kind: "program", applicationStatus: "future", distance: 1 },
  { period: "HT 2026", city: "Umeå", provider: "Umeå universitet", kind: "program", applicationStatus: "closed", distance: 0 },
  { period: "VT 2027", city: "Göteborg", provider: "Göteborgs universitet", kind: "program", applicationStatus: "open", distance: 0 },
  { period: "HT 2027", city: "Malmö", provider: "Malmö universitet", kind: "program", applicationStatus: "unknown", distance: 0 },
];

test("alla alternativ hämtas ur utbudet, utan dubbletter och i rätt ordning", () => {
  assert.deepEqual(buildLiveFilterOptions([...rows, rows[0]]), {
    periods: ["HT 2026", "VT 2027", "HT 2027"],
    cities: ["Göteborg", "Malmö", "Umeå"],
    providers: ["Göteborgs universitet", "Malmö universitet", "Umeå universitet"],
    kinds: ["program"],
    applicationStatuses: ["open", "future", "closed", "unknown"],
    distanceAvailable: true,
  });
});

test("valt lärosäte begränsar övriga menyer men låter användaren byta lärosäte", () => {
  const options = buildLiveFilterOptions(rows, { provider: "Umeå universitet" });
  assert.deepEqual(options.periods, ["HT 2026", "HT 2027"]);
  assert.deepEqual(options.cities, ["Umeå"]);
  assert.deepEqual(options.applicationStatuses, ["future", "closed"]);
  assert.deepEqual(options.providers, ["Göteborgs universitet", "Malmö universitet", "Umeå universitet"]);
});

test("kombinerade val visar bara möjliga alternativ i varje meny", () => {
  const options = buildLiveFilterOptions(rows, { provider: "Umeå universitet", period: "HT 2027" });
  assert.deepEqual(options.periods, ["HT 2026", "HT 2027"]);
  assert.deepEqual(options.providers, ["Malmö universitet", "Umeå universitet"]);
  assert.deepEqual(options.cities, ["Umeå"]);
  assert.deepEqual(options.applicationStatuses, ["future"]);
  assert.equal(options.distanceAvailable, true);
});

test("ansökningsläge och distans påverkar de andra alternativen", () => {
  const options = buildLiveFilterOptions(rows, { distance: "1", applicationStatus: "future" });
  assert.deepEqual(options.periods, ["HT 2027"]);
  assert.deepEqual(options.providers, ["Umeå universitet"]);
  assert.deepEqual(options.cities, ["Umeå"]);
  assert.deepEqual(options.applicationStatuses, ["future"]);
  assert.equal(options.distanceAvailable, true);
});

test("distans stängs av som alternativ när inga matchande distansposter finns", () => {
  const options = buildLiveFilterOptions(rows, { city: "Göteborg" });
  assert.equal(options.distanceAvailable, false);
  assert.deepEqual(options.applicationStatuses, ["open"]);
});

test("oförenliga val lämnar alternativ för att ändra respektive filter", () => {
  const options = buildLiveFilterOptions(rows, { city: "Göteborg", provider: "Umeå universitet" });
  assert.deepEqual(options.cities, ["Umeå"]);
  assert.deepEqual(options.providers, ["Göteborgs universitet"]);
  assert.deepEqual(options.periods, []);
  assert.deepEqual(options.applicationStatuses, []);
});

test("tom sökträfflista hittar inte på filteralternativ", () => {
  assert.deepEqual(buildLiveFilterOptions([], { provider: "Karolinska institutet" }), emptyLiveFilterOptions());
});

test("saknade fält skapar inga tomma menyval och falskt distansvärde räknas inte som distans", () => {
  const options = buildLiveFilterOptions([
    { period: "", city: null, provider: "  ", kind: "program", applicationStatus: "unknown", distance: "0" },
  ], { distance: "0" });
  assert.deepEqual(options, { ...emptyLiveFilterOptions(), kinds: ["program"], applicationStatuses: ["unknown"] });
});

test("alternativ från senare resultatsidor finns med", () => {
  const manyRows = Array.from({ length: 200 }, () => rows[0]);
  assert.deepEqual(buildLiveFilterOptions([...manyRows, rows[2]]).providers, ["Göteborgs universitet", "Umeå universitet"]);
});

test("orter med olika skiftläge blir ett val och matchar samma utbildningar", () => {
  const mixedRows = [rows[2], { ...rows[2], city: "GÖTEBORG", provider: "Annat lärosäte" }];
  const options = buildLiveFilterOptions(mixedRows, { city: "Göteborg" });
  assert.deepEqual(options.cities, ["Göteborg"]);
  assert.deepEqual(options.providers, ["Annat lärosäte", "Göteborgs universitet"]);
});

test("telefonnummer i källans ortsfält visas inte som orter", () => {
  assert.deepEqual(buildLiveFilterOptions([{ ...rows[0], city: "08-608 40 00" }]).cities, []);
});
