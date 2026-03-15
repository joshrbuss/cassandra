-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "solvingFen" TEXT NOT NULL,
    "lastMove" TEXT NOT NULL,
    "solutionMoves" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "themes" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'standard',
    "candidateMoves" TEXT,
    "weaknessSquares" TEXT,
    "weaknessExplanation" TEXT,
    "ecoCode" TEXT,
    "openingName" TEXT,
    "eloRangeMin" INTEGER,
    "eloRangeMax" INTEGER,
    "subtype" TEXT,
    "source" TEXT,
    "sourceUserId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "puzzleId" TEXT NOT NULL,
    "solveTimeMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "tacticType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteStats" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalPuzzlesSolved" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "chessComUsername" TEXT,
    "lichessUsername" TEXT,
    "chessComLinkedAt" TIMESTAMP(3),
    "lichessLinkedAt" TIMESTAMP(3),
    "elo" INTEGER,
    "rawElo" INTEGER,
    "normalizedElo" INTEGER,
    "eloPlatform" TEXT,
    "avatarUrl" TEXT,
    "battleRating" INTEGER NOT NULL DEFAULT 1200,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPuzzleDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "winnerId" TEXT,
    "rounds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Puzzle_ecoCode_idx" ON "Puzzle"("ecoCode");

-- CreateIndex
CREATE INDEX "Puzzle_eloRangeMin_eloRangeMax_idx" ON "Puzzle"("eloRangeMin", "eloRangeMax");

-- CreateIndex
CREATE INDEX "Puzzle_sourceUserId_idx" ON "Puzzle"("sourceUserId");

-- CreateIndex
CREATE INDEX "Puzzle_source_idx" ON "Puzzle"("source");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_puzzleId_idx" ON "PuzzleAttempt"("puzzleId");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_userId_idx" ON "PuzzleAttempt"("userId");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_userId_tacticType_idx" ON "PuzzleAttempt"("userId", "tacticType");

-- CreateIndex
CREATE UNIQUE INDEX "User_chessComUsername_key" ON "User"("chessComUsername");

-- CreateIndex
CREATE UNIQUE INDEX "User_lichessUsername_key" ON "User"("lichessUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "Battle_status_idx" ON "Battle"("status");

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleAttempt" ADD CONSTRAINT "PuzzleAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
