import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8"));
const traits = read("traits.json");
const questions = read("questions.json");
const adaptiveQuestions = read("adaptive-questions.json");
const programs = read("programs.json");
const priorities = read("priorities.json");
const dealBreakers = read("dealbreakers.json");

const traitKeys = Object.keys(traits);
const traitSet = new Set(traitKeys);

if (questions.length !== 50) throw new Error(`Expected 50 base questions, found ${questions.length}`);

const ids = new Set();
const sections = new Set();
function validateQuestion(question, adaptive = false) {
  if (ids.has(question.id)) throw new Error(`Duplicate question id ${question.id}`);
  ids.add(question.id);
  if (!adaptive) {
    if (!question.section) throw new Error(`Missing section in question ${question.id}`);
    sections.add(question.section);
  }
  const groups = [question.weights || {}, question.reverseWeights || {}];
  if (!Object.keys(groups[0]).length && !Object.keys(groups[1]).length) throw new Error(`Question ${question.id} has no weights`);
  for (const weights of groups) {
    for (const [trait, weight] of Object.entries(weights)) {
      if (!traitSet.has(trait)) throw new Error(`Unknown trait "${trait}" in question ${question.id}`);
      if (typeof weight !== "number" || weight <= 0 || weight > 1) throw new Error(`Invalid weight in question ${question.id}`);
    }
  }
  if (adaptive && !traitSet.has(question.trait)) throw new Error(`Unknown adaptive trait ${question.trait}`);
}
questions.forEach((question) => validateQuestion(question));
adaptiveQuestions.forEach((question) => validateQuestion(question, true));

for (const program of programs) {
  const keys = Object.keys(program.vector);
  if (keys.length !== traitKeys.length || !keys.every((key) => traitSet.has(key))) throw new Error(`Invalid vector for ${program.title} / ${program.institution}`);
  for (const value of Object.values(program.vector)) {
    if (typeof value !== "number" || value < 0 || value > 1) throw new Error(`Vector value out of range for ${program.title}`);
  }
}

for (const priority of priorities) {
  if (!priority.id || !priority.label || !Array.isArray(priority.traits) || !priority.traits.length) throw new Error(`Invalid priority ${priority.id || "unknown"}`);
  priority.traits.forEach((trait) => { if (!traitSet.has(trait)) throw new Error(`Unknown priority trait ${trait}`); });
}

for (const rule of dealBreakers) {
  if (!rule.id || !rule.label || !["trait", "lab", "years"].includes(rule.kind)) throw new Error(`Invalid deal-breaker ${rule.id || "unknown"}`);
  if (rule.kind === "trait" && !traitSet.has(rule.key)) throw new Error(`Unknown deal-breaker trait ${rule.key}`);
  if (!(rule.maxPenalty > 0 && rule.maxPenalty <= 0.25)) throw new Error(`Invalid penalty for ${rule.id}`);
}

console.log(`OK v0.7: ${questions.length} base questions + ${adaptiveQuestions.length} adaptive questions, ${sections.size} sections, ${traitKeys.length} traits, ${programs.length} programs, ${priorities.length} priorities, ${dealBreakers.length} deal-breakers.`);
