CREATE TABLE IF NOT EXISTS susa_sync_state (
  key text PRIMARY KEY,
  value text,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS susa_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  organisation_number text,
  website text,
  email text,
  city text,
  school_type text,
  last_edited text,
  expires text,
  synced_at text NOT NULL,
  raw_json text NOT NULL
);

CREATE TABLE IF NOT EXISTS susa_education_infos (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  school_type text,
  level text,
  kind text,
  credits double precision,
  credits_unit text,
  eligibility text,
  provider_ids_json text NOT NULL DEFAULT '[]',
  provider_name text,
  application_code text,
  urls_json text NOT NULL DEFAULT '[]',
  subject_codes_json text NOT NULL DEFAULT '[]',
  degree text,
  student_aid text,
  last_edited text,
  expires text,
  synced_at text NOT NULL,
  raw_json text NOT NULL
);

CREATE TABLE IF NOT EXISTS susa_education_events (
  id text PRIMARY KEY,
  education_info_id text,
  title text NOT NULL,
  provider_name text,
  provider_id text,
  provider_ids_json text NOT NULL DEFAULT '[]',
  city text,
  start_date text,
  end_date text,
  period text,
  study_form text,
  study_pace text,
  language text,
  credits double precision,
  credits_unit text,
  level text,
  kind text,
  eligibility text,
  description text,
  application_open text,
  application_deadline text,
  application_url text,
  application_code text,
  source_url text,
  school_type text,
  distance integer NOT NULL DEFAULT 0,
  subject_codes_json text NOT NULL DEFAULT '[]',
  degree text,
  student_aid text,
  last_edited text,
  expires text,
  canonical_program_id integer,
  link_score double precision,
  link_method text,
  link_evidence_json text NOT NULL DEFAULT '{}',
  synced_at text NOT NULL,
  raw_json text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supa_susa_events_period ON susa_education_events(period);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_provider ON susa_education_events(provider_name);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_city ON susa_education_events(city);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_start_date ON susa_education_events(start_date);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_program ON susa_education_events(canonical_program_id);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_school_type ON susa_education_events(school_type);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_kind ON susa_education_events(kind);
CREATE INDEX IF NOT EXISTS idx_supa_susa_events_link_score ON susa_education_events(link_score);
CREATE INDEX IF NOT EXISTS idx_supa_susa_infos_school_type ON susa_education_infos(school_type);

CREATE TABLE IF NOT EXISTS hk_analytics_daily (
  day date PRIMARY KEY,
  total_events integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  visits integer NOT NULL DEFAULT 0,
  starts integer NOT NULL DEFAULT 0,
  completions integer NOT NULL DEFAULT 0,
  result_views integer NOT NULL DEFAULT 0,
  application_clicks integer NOT NULL DEFAULT 0,
  compare_events integer NOT NULL DEFAULT 0,
  save_events integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hk_analytics_event_daily (
  day date NOT NULL,
  event text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, event)
);

CREATE TABLE IF NOT EXISTS hk_analytics_path_daily (
  day date NOT NULL,
  path text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, path)
);

CREATE INDEX IF NOT EXISTS idx_hk_analytics_event_day ON hk_analytics_event_daily(day);
CREATE INDEX IF NOT EXISTS idx_hk_analytics_path_day ON hk_analytics_path_daily(day);
