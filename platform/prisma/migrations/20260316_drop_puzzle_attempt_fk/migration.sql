-- DropForeignKey
-- PuzzleAttempt.puzzleId can reference either Puzzle or LibraryPuzzle,
-- so a single FK to Puzzle is incorrect and causes library puzzle attempts to fail.
ALTER TABLE "PuzzleAttempt" DROP CONSTRAINT "PuzzleAttempt_puzzleId_fkey";
