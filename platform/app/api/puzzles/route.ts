import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTactics } from "@/lib/tactics";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export interface PuzzleListItem {
  id: string;
  rating: number;
  themes: string;
  type: string;
  tacticType: string | null;
  ecoCode: string | null;
  openingName: string | null;
}

export interface PuzzleListResponse {
  puzzles: PuzzleListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * GET /api/puzzles
 * Query params:
 *   tactics    — comma-separated tactic tags, e.g. "fork,pin"
 *   type       — puzzle type filter: "standard" | "retrograde" | "opponent_prediction"
 *   eco        — ECO opening code, e.g. "B90"
 *   elo_range  — ELO band, e.g. "1200-1399"
 *   source     — "user_import" to show only user-generated puzzles
 *   page       — 1-indexed page number (default 1)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const tactics = parseTactics(searchParams.get("tactics"));
  const typeFilter = searchParams.get("type");
  const ecoFilter = searchParams.get("eco")?.trim().toUpperCase() || null;
  const eloRangeRaw = searchParams.get("elo_range");
  const sourceFilter = searchParams.get("source") || null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  // Parse elo_range param, e.g. "1200-1399"
  let eloRange: { min: number; max: number } | null = null;
  if (eloRangeRaw) {
    const [minStr, maxStr] = eloRangeRaw.split("-");
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (!isNaN(min) && !isNaN(max)) eloRange = { min, max };
  }

  // Build where clause — themes is space-separated so we use contains per tactic
  const where: Prisma.PuzzleWhereInput = {};

  if (typeFilter) where.type = typeFilter;
  if (ecoFilter) where.ecoCode = ecoFilter;
  if (sourceFilter) where.source = sourceFilter;
  if (eloRange) {
    where.eloRangeMin = { equals: eloRange.min };
    where.eloRangeMax = { equals: eloRange.max };
  }

  if (tactics.length === 1) {
    where.themes = { contains: tactics[0] };
  } else if (tactics.length > 1) {
    // OR across all selected tactics
    where.OR = tactics.map((t) => ({ themes: { contains: t } }));
  }

  const [puzzles, total] = await Promise.all([
    prisma.puzzle.findMany({
      where,
      select: {
        id: true,
        rating: true,
        themes: true,
        type: true,
        ecoCode: true,
        openingName: true,
      },
      orderBy: { rating: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.puzzle.count({ where }),
  ]);

  const items: PuzzleListItem[] = puzzles.map((p) => ({
    ...p,
    tacticType: p.themes.trim().split(/\s+/)[0] || null,
  }));

  const response: PuzzleListResponse = {
    puzzles: items,
    total,
    page,
    pageSize: PAGE_SIZE,
  };

  return NextResponse.json(response);
}
