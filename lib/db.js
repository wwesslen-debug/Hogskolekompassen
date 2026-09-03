import fs from "node:fs";
import path from "node:path";
import { enrichProgram } from "@/lib/program-insights";
import {
  getSupabaseLiveDataStatus,
  getSupabaseLiveFilterOptions,
  getSupabaseLiveLinkQuality,
  getSupabaseLiveOfferingCount,
  getSupabaseLiveOfferings,
  getSupabaseLiveRecommendationCandidates,
  getSupabaseLiveRecommendationsForPrograms,
  getSupabaseLiveSitemapEntries,
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

export function getProgramsByIds(ids = []) {
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 12);
  if (!clean.length) return [];

  const byId = new Map(loadSeedPrograms().map((program) => [program.id, program]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

export async function getLiveOfferings(filters = {}) {
  return withSupabaseLive([], () => getSupabaseLiveOfferings(filters));
}

export async function getLiveOfferingCount(filters = {}) {
  return withSupabaseLive(0, () => getSupabaseLiveOfferingCount(filters));
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

export async function getLiveSitemapEntries(limit = 5000) {
  return withSupabaseLive([], () => getSupabaseLiveSitemapEntries(limit));
}
