import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = path.join(root, "db", "hogskolekompassen.sqlite");
const questions = JSON.parse(fs.readFileSync(path.join(root, "data", "questions.json"), "utf8"));
const programs = JSON.parse(fs.readFileSync(path.join(root, "data", "programs.json"), "utf8"));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE questions (
    id INTEGER PRIMARY KEY,
    section TEXT NOT NULL,
    text TEXT NOT NULL,
    weights_json TEXT NOT NULL,
    reverse_weights_json TEXT NOT NULL
  );

  CREATE TABLE programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    institution TEXT NOT NULL,
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    years REAL NOT NULL,
    degree TEXT NOT NULL,
    study TEXT NOT NULL,
    description TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    vector_json TEXT NOT NULL,
    data_status TEXT NOT NULL,
    antagning_search TEXT NOT NULL
  );

  CREATE INDEX idx_programs_city ON programs(city);
  CREATE INDEX idx_programs_category ON programs(category);
  CREATE INDEX idx_programs_title ON programs(title);

  CREATE TABLE susa_sync_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE susa_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organisation_number TEXT,
    website TEXT,
    email TEXT,
    city TEXT,
    school_type TEXT,
    last_edited TEXT,
    expires TEXT,
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );

  CREATE TABLE susa_education_infos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    school_type TEXT,
    level TEXT,
    kind TEXT,
    credits REAL,
    credits_unit TEXT,
    eligibility TEXT,
    provider_ids_json TEXT NOT NULL DEFAULT '[]',
    provider_name TEXT,
    application_code TEXT,
    urls_json TEXT NOT NULL DEFAULT '[]',
    subject_codes_json TEXT NOT NULL DEFAULT '[]',
    degree TEXT,
    student_aid TEXT,
    last_edited TEXT,
    expires TEXT,
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );

  CREATE TABLE susa_education_events (
    id TEXT PRIMARY KEY,
    education_info_id TEXT,
    title TEXT NOT NULL,
    provider_name TEXT,
    provider_id TEXT,
    provider_ids_json TEXT NOT NULL DEFAULT '[]',
    city TEXT,
    start_date TEXT,
    end_date TEXT,
    period TEXT,
    study_form TEXT,
    study_pace TEXT,
    language TEXT,
    credits REAL,
    credits_unit TEXT,
    level TEXT,
    kind TEXT,
    eligibility TEXT,
    description TEXT,
    application_open TEXT,
    application_deadline TEXT,
    application_url TEXT,
    application_code TEXT,
    source_url TEXT,
    school_type TEXT,
    distance INTEGER NOT NULL DEFAULT 0,
    subject_codes_json TEXT NOT NULL DEFAULT '[]',
    degree TEXT,
    student_aid TEXT,
    last_edited TEXT,
    expires TEXT,
    canonical_program_id INTEGER,
    link_score REAL,
    link_method TEXT,
    link_evidence_json TEXT NOT NULL DEFAULT '{}',
    synced_at TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    FOREIGN KEY (canonical_program_id) REFERENCES programs(id)
  );

  CREATE INDEX idx_susa_events_period ON susa_education_events(period);
  CREATE INDEX idx_susa_events_provider ON susa_education_events(provider_name);
  CREATE INDEX idx_susa_events_city ON susa_education_events(city);
  CREATE INDEX idx_susa_events_start_date ON susa_education_events(start_date);
  CREATE INDEX idx_susa_events_program ON susa_education_events(canonical_program_id);
  CREATE INDEX idx_susa_infos_school_type ON susa_education_infos(school_type);
`);

const insertQuestion = db.prepare(`
  INSERT INTO questions (id, section, text, weights_json, reverse_weights_json)
  VALUES (@id, @section, @text, @weights, @reverseWeights)
`);

const insertProgram = db.prepare(`
  INSERT INTO programs (
    title, institution, city, category, years, degree, study,
    description, tags_json, vector_json, data_status, antagning_search
  ) VALUES (
    @title, @institution, @city, @category, @years, @degree, @study,
    @description, @tags, @vector, @dataStatus, @antagningSearch
  )
`);

const seed = db.transaction(() => {
  for (const question of questions) {
    insertQuestion.run({
      id: question.id,
      section: question.section,
      text: question.text,
      weights: JSON.stringify(question.weights || {}),
      reverseWeights: JSON.stringify(question.reverseWeights || {}),
    });
  }

  for (const program of programs) {
    insertProgram.run({
      ...program,
      tags: JSON.stringify(program.tags),
      vector: JSON.stringify(program.vector),
    });
  }
});

seed();
db.close();

console.log(`Seeded ${questions.length} questions, ${programs.length} programs and empty v0.7 Susa-navet live-data tables.`);
console.log(dbPath);
