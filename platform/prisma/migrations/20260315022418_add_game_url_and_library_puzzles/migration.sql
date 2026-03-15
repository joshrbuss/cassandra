-- AlterTable
ALTER TABLE "Puzzle" ADD COLUMN     "gameUrl" TEXT;

-- CreateTable
CREATE TABLE "LibraryPuzzle" (
    "id" TEXT NOT NULL,
    "lichessId" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "solvingFen" TEXT NOT NULL,
    "lastMove" TEXT NOT NULL,
    "solutionMoves" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "themes" TEXT NOT NULL DEFAULT '',
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "gameUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryPuzzle_lichessId_key" ON "LibraryPuzzle"("lichessId");

-- CreateIndex
CREATE INDEX "LibraryPuzzle_rating_idx" ON "LibraryPuzzle"("rating");
