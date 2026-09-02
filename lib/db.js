import fs from "node:fs";
import path from "node:path";
import { enrichProgram } from "@/lib/program-insights";
import { matchesSearch, parseSearchQuery, scoreSearchMatch } from "@/lib/search.mjs";
import {
  getSupabaseLiveDataStatus,
  getSupabaseLiveFilterOptions,
  getSupabaseLiveLinkQuality,
  getSupabaseLiveOfferingCount,
  getSupabaseLiveOfferings,
  getSupabaseLiveRecommendationCandidates,
  getSupabaseLiveRecommendationsForPrograms,
  isSupabaseLiveConfigured,
} from "@/lib/supabase-db";

let seedQuestions;
let seedPrograms;
let supabaseWarningPrinted = false;

function loadSeedQuestions() {
  if (!seedQuestions) {
    seedQuestions = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "questions.json"), "utf8"));
  }
  return seedQuestions;
}

function loadSeedPrograms() {
  if (!seedPrograms) {
    const programs = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "programs.json"), "utf8"));
    seedPrograms = programs.map((program, index) => enrichProgram({
      ...program,
      id: index + 1,
      liveOfferCount: 0,
    }));
  }
  return seedPrograms;
}

function emptyLiveStatus(errorMessage = null) {
  return {
    ready: false,
    eventCount: 0,
    linkedCount: 0,
    linkRate: 0,
    providerCount: 0,
    periods: [],
    lastSync: null,
    schoolType: process.env.SUSA_SCHOOL_TYPE || "HS",
    source: "supabase",
    supabaseConfigured: isSupabaseLiveConfigured(),
    ...(errorMessage ? { supabaseError: errorMessage } : {}),
  };
}

function emptyLiveFilterOptions(errorMessage = null) {
  return {
    periods: [],
    cities: [],
    providers: [],
    kinds: [],
    source: "supabase",
    supabaseConfigured: isSupabaseLiveConfigured(),
    ...(errorMessage ? { supabaseError: errorMessage } : {}),
  };
}

function emptyLiveLinkQuality(errorMessage = null) {
  return {
    ready: false,
    total: 0,
    linked: 0,
    unlinked: 0,
    linkRate: 0,
    confidence: { high: 0, medium: 0, exploratory: 0 },
    byKind: [],
    methods: [],
    topUnmatched: [],
    topCanonical: [],
    source: "supabase",
    supabaseConfigured: isSupabaseLiveConfigured(),
    ...(errorMessage ? { supabaseError: errorMessage } : {}),
  };
}

function annotateSupabaseObject(value, errorMessage) {
  if (!value || Array.isArray(value) || typeof value !== "object") return value;
  return {
    ...value,
    source: "supabase",
    supabaseConfigured: isSupabaseLiveConfigured(),
    ...(errorMessage ? { supabaseError: errorMessage } : {}),
  };
}

async function withSupabaseLive(fallback, task) {
  const fallbackValue = typeof fallback === "function" ? fallback : () => fallback;
  if (!isSupabaseLiveConfigured()) {
    return annotateSupabaseObject(fallbackValue(), "SUPABASE_DATABASE_URL is not configured.");
  }

  try {
    return await task();
  } catch (error) {
    const message = error?.message || "Supabase live-data read failed.";
    if (!supabaseWarningPrinted) {
      supabaseWarningPrinted = true;
      console.warn("Supabase live-data read failed.", message);
    }
    return annotateSupabaseObject(fallbackValue(message), message);
  }
}

export function getQuestions() {
  return loadSeedQuestions();
}

function filterSeedPrograms(filters = {}) {
  let programs = loadSeedPrograms();

  if (filters.city) programs = programs.filter((program) => program.city === filters.city);
  if (filters.category) programs = programs.filter((program) => program.category === filters.category);
  if (filters.degree) programs = programs.filter((program) => program.degree === filters.degree);
  if (filters.liveOnly) programs = [];

  if (filters.search) {
    const search = parseSearchQuery(filters.search);
    if (search.groups.length) {
      programs = programs
        .map((program) => ({
          program,
          searchRank: scoreSearchMatch({
            title: program.title,
            provider: program.institution,
            category: program.category,
            degree: program.degree,
            city: program.city,
            description: program.description,
            tags: program.tags,
          }, search),
        }))
        .filter(({ program }) => matchesSearch([
          program.title,
          program.institution,
          program.category,
          program.degree,
          program.description,
          ...(program.tags || []),
        ], search))
        .sort((a, b) => b.searchRank - a.searchRank || a.program.title.localeCompare(b.program.title, "sv"))
        .map(({ program }) => program);
    }
  }

  return programs;
}

export function getPrograms(filters = {}) {
  const requestedLimit = Number(filters.limit || 500);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 500, 1000));
  return filterSeedPrograms(filters).slice(0, limit);
}

export function getProgramsByIds(ids = []) {
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 12);
  if (!clean.length) return [];

  const byId = new Map(loadSeedPrograms().map((program) => [program.id, program]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

export function getProgramById(id) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return loadSeedPrograms().find((program) => program.id === numeric) || null;
}

export function getRelatedPrograms(program, limit = 6) {
  if (!program) return [];
  const safeLimit = Math.max(1, Math.min(limit, 12));
  return loadSeedPrograms()
    .filter((candidate) => candidate.category === program.category && candidate.id !== program.id)
    .slice(0, safeLimit);
}

export function getProgramCount(filters = {}) {
  return filterSeedPrograms(filters).length;
}

export function getFilterOptions() {
  const programs = loadSeedPrograms();
  return {
    cities: [...new Set(programs.map((program) => program.city))].sort((a, b) => {
      if (a === "Flera orter") return 1;
      if (b === "Flera orter") return -1;
      return a.localeCompare(b, "sv");
    }),
    categories: [...new Set(programs.map((program) => program.category))].sort((a, b) => a.localeCompare(b, "sv")),
    degrees: [...new Set(programs.map((program) => program.degree))].sort((a, b) => a.localeCompare(b, "sv")),
  };
}

export async function getLiveOfferings(filters = {}) {
  return withSupabaseLive([], () => getSupabaseLiveOfferings(filters));
}

export async function getLiveOfferingCount(filters = {}) {
  return withSupabaseLive(0, () => getSupabaseLiveOfferingCount(filters));
}

export async function getLiveOfferingsForProgram(programId, limit = 10) {
  const numeric = Number(programId);
  if (!Number.isInteger(numeric) || numeric <= 0) return [];
  return getLiveOfferings({ programId: numeric, limit, upcoming: true });
}

export async function getLiveFilterOptions() {
  return withSupabaseLive(emptyLiveFilterOptions, getSupabaseLiveFilterOptions);
}

export async function getLiveDataStatus() {
  return withSupabaseLive(emptyLiveStatus, getSupabaseLiveDataStatus);
}

export async function getLiveRecommendationsForPrograms(programIds = [], options = {}) {
  return withSupabaseLive([], () => getSupabaseLiveRecommendationsForPrograms(programIds, options));
}

export async function getLiveRecommendationCandidates(options = {}) {
  return withSupabaseLive([], () => getSupabaseLiveRecommendationCandidates(options));
}

export async function getLiveLinkQuality(limit = 20) {
  return withSupabaseLive(emptyLiveLinkQuality, () => getSupabaseLiveLinkQuality(limit));
}
