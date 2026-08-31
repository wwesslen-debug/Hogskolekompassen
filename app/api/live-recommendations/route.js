import { NextResponse } from "next/server";
import {
  getLiveDataStatus,
  getLiveRecommendationCandidates,
  getLiveRecommendationsForPrograms,
} from "@/lib/db";
import { compareLiveOfferings, scoreLiveCandidates } from "@/lib/live-matching";

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
  const selectedPriorities = cleanIdList(body.priorities || body.selectedPriorities);
  const selectedDealBreakers = cleanIdList(body.dealBreakers || body.selectedDealBreakers);
  const selectedInterests = cleanIdList(body.interests || body.selectedInterests);
  const profileResult = {
    profile: body.profile,
    traitConfidence: body.traitConfidence && typeof body.traitConfidence === "object" ? body.traitConfidence : {},
  };

  const scored = scoreLiveCandidates(profileResult, candidates, {
    selectedPriorities,
    selectedDealBreakers,
    selectedInterests,
    intentCertainty: body.intentCertainty,
  });

  const preferredIds = new Set(ids);
  const eligible = scored
    .filter((offering) => offering.personalScore >= 42 || preferredIds.has(Number(offering.canonicalProgramId)))
    .sort(compareLiveOfferings);
  const pool = eligible.length ? eligible : scored.sort(compareLiveOfferings);
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
      linkedScoreCount: 0,
      inferredOnlyCount: scored.length,
    },
  });
}
