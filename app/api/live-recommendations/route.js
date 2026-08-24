import { NextResponse } from "next/server";
import {
  getLiveDataStatus,
  getLiveRecommendationCandidates,
  getLiveRecommendationsForPrograms,
} from "@/lib/db";
import { scoreLiveOfferingForProfile } from "@/lib/live-profile-inference";

export const runtime = "nodejs";

function cleanProgramIds(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 30);
}

function cleanIdList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

function cleanScoreMap(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key, Number(score)])
      .filter(([, score]) => Number.isFinite(score))
  );
}

function dateValue(value) {
  const time = value ? new Date(`${value}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function applicationRank(offering) {
  const today = new Date().toISOString().slice(0, 10);
  if (offering.applicationDeadline && offering.applicationDeadline >= today && (!offering.applicationOpen || offering.applicationOpen <= today)) return 0;
  if (offering.applicationOpen && offering.applicationOpen > today) return 1;
  if (!offering.applicationDeadline && !offering.applicationOpen) return 2;
  return 3;
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function offeringKey(offering) {
  return [
    normalizeKey(offering.title),
    offering.providerId || normalizeKey(offering.providerName),
    offering.period || offering.startDate || "",
    normalizeKey(offering.city),
  ].join("|");
}

function demandPriority(offering) {
  const text = normalizeKey([
    offering.title,
    offering.degree,
    offering.inferredCategory,
    offering.providerName,
  ].join(" "));

  let score = 0;
  if (/(lakare|jurist|psykolog|sjukskoterska|sjukskoterske|socionom|civilingenjor|hogskoleingenjor|systemvetenskap|datavetenskap|dataingenjor|ekonom|ekonomi|foretagsekonomi|larare|amneslarare|grundlarare|forskollarare|arkitekt|fysioterapeut|biomedicinsk analytiker|tandlakare|apotekare|röntgensjukskoterska|rontgensjukskoterska)/.test(text)) score += 8;
  if (/(kandidatprogram|programmet|program i|yrkesexamen|kandidatexamen|hogskoleexamen)/.test(text)) score += 3;
  if (/(pianostamm|kyrkomusiker|opera|cirkus|dockteater|konsthantverk)/.test(text)) score -= 8;
  if (/(senare del|utbytesstudier|exchange studies|later part)/.test(text)) score -= 20;

  return Math.max(-10, Math.min(10, score));
}

function rankingScore(offering) {
  return Number(offering.personalScore || 0) + demandPriority(offering);
}

function compareOfferings(a, b) {
  return rankingScore(b) - rankingScore(a)
    || Number(b.personalScore || 0) - Number(a.personalScore || 0)
    || applicationRank(a) - applicationRank(b)
    || Number(b.matchConfidence || 0) - Number(a.matchConfidence || 0)
    || Number(b.linkScore || 0) - Number(a.linkScore || 0)
    || dateValue(a.startDate) - dateValue(b.startDate)
    || String(a.title || "").localeCompare(String(b.title || ""), "sv");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = cleanProgramIds(searchParams.get("ids"));
  const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") || 12)));
  const perProgram = Math.max(1, Math.min(5, Number(searchParams.get("perProgram") || 3)));
  const status = await getLiveDataStatus();

  if (!status.ready || !status.eventCount || !ids.length) {
    return NextResponse.json({ offerings: [], status });
  }

  return NextResponse.json({
    offerings: await getLiveRecommendationsForPrograms(ids, { limit, perProgram }),
    status,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(30, Number(body.limit || 12)));
  const candidateLimit = Math.max(200, Math.min(5000, Number(body.candidateLimit || 3500)));
  const ids = cleanProgramIds(body.ids);
  const status = await getLiveDataStatus();

  if (!status.ready || !status.eventCount || !body?.profile || typeof body.profile !== "object") {
    return NextResponse.json({
      offerings: [],
      status,
      coverage: {
        candidateCount: 0,
        scoredCount: 0,
        eligibleCount: 0,
        linkedScoreCount: 0,
        inferredOnlyCount: 0,
      },
      recommendationMode: "direct_live_profile",
    });
  }

  const candidates = await getLiveRecommendationCandidates({ limit: candidateLimit });
  const scoreById = cleanScoreMap(body.scoreById);
  const selectedPriorities = cleanIdList(body.priorities || body.selectedPriorities);
  const selectedDealBreakers = cleanIdList(body.dealBreakers || body.selectedDealBreakers);
  const selectedInterests = cleanIdList(body.interests || body.selectedInterests);
  const profileResult = {
    profile: body.profile,
    traitConfidence: body.traitConfidence && typeof body.traitConfidence === "object" ? body.traitConfidence : {},
  };

  const scored = candidates.map((offering) => ({
    ...offering,
    ...scoreLiveOfferingForProfile(offering, profileResult, {
      scoreById,
      selectedPriorities,
      selectedDealBreakers,
      selectedInterests,
    }),
  })).map((offering) => ({
    ...offering,
    demandPriority: demandPriority(offering),
  }));

  const preferredIds = new Set(ids);
  const eligible = scored
    .filter((offering) => offering.personalScore >= 42 || preferredIds.has(Number(offering.canonicalProgramId)))
    .sort(compareOfferings);
  const pool = eligible.length ? eligible : scored.sort(compareOfferings);
  const seen = new Set();
  const offerings = [];

  for (const offering of pool) {
    const key = offeringKey(offering);
    if (seen.has(key)) continue;
    seen.add(key);
    offerings.push(offering);
    if (offerings.length >= limit) break;
  }

  return NextResponse.json({
    offerings,
    status,
    recommendationMode: "direct_live_profile",
    coverage: {
      candidateCount: candidates.length,
      scoredCount: scored.length,
      eligibleCount: eligible.length,
      linkedScoreCount: scored.filter((item) => item.linkedScore != null).length,
      inferredOnlyCount: scored.filter((item) => item.matchSource === "live_profile").length,
    },
  });
}
