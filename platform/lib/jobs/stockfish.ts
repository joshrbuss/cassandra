import "server-only";

/**
 * Stockfish UCI wrapper for Node.js.
 *
 * Resolution order:
 *  1. System `stockfish` binary at known paths (macOS/Linux)
 *  2. npm `stockfish` package – spawns via `node ./node_modules/stockfish/bin/stockfish-18-lite-single.js`
 *  3. Bare "stockfish" on PATH (last resort, local dev only)
 *
 * On Vercel serverless, only option 2 works. Requires:
 *  - `serverExternalPackages: ["stockfish"]` in next.config.ts
 *  - The WASM file co-located with the JS entry point
 */

import { spawn } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export interface EngineResult {
  /** Best move in UCI notation, e.g. "e2e4" */
  move: string;
  /** Centipawn score from the engine's perspective (positive = good for side to move) */
  cp: number;
}

let cachedCommand: string[] | null | undefined;

function getEngineCommand(): string[] | null {
  if (cachedCommand !== undefined) return cachedCommand;

  // 1. System binary (check known paths — do NOT trust bare "stockfish" on PATH
  //    because on Vercel serverless it doesn't exist and spawn will fail silently)
  const systemPaths = [
    "/opt/homebrew/bin/stockfish",
    "/usr/local/bin/stockfish",
    "/usr/bin/stockfish",
  ];
  for (const p of systemPaths) {
    if (existsSync(p)) {
      console.log(`[stockfish] Using system binary: ${p}`);
      cachedCommand = [p];
      return cachedCommand;
    }
  }

  // 2. npm package — works on Vercel serverless via `node <path>`
  //    Try multiple base paths and file names
  const sfFiles = [
    "node_modules/stockfish/bin/stockfish-18-lite-single.js",
    "node_modules/stockfish/bin/stockfish.js",
  ];
  const basePaths = [
    process.cwd(),
    join(__dirname, "..", ".."),              // lib/jobs/../../node_modules
    "/var/task",                               // Vercel serverless
    join(__dirname, "..", "..", "..", ".."),   // deeper traversal for bundled output
  ];

  console.log(`[stockfish] Searching npm package. cwd=${process.cwd()} __dirname=${__dirname}`);

  for (const base of basePaths) {
    for (const sf of sfFiles) {
      const candidate = join(base, sf);
      if (existsSync(candidate)) {
        // Also verify the WASM file exists alongside
        const wasmFile = candidate.replace(/\.js$/, ".wasm");
        const wasmExists = existsSync(wasmFile);
        console.log(`[stockfish] Found JS: ${candidate} (WASM: ${wasmExists ? "yes" : "MISSING"})`);
        cachedCommand = ["node", candidate];
        return cachedCommand;
      }
    }
  }

  // Log what we can see in node_modules for debugging
  try {
    const sfDir = join(process.cwd(), "node_modules/stockfish");
    if (existsSync(sfDir)) {
      const binDir = join(sfDir, "bin");
      if (existsSync(binDir)) {
        const files = readdirSync(binDir);
        console.log(`[stockfish] bin/ contents: ${files.join(", ")}`);
      } else {
        console.log(`[stockfish] stockfish package exists but no bin/ directory`);
      }
    } else {
      console.log(`[stockfish] stockfish package NOT found in node_modules`);
    }
  } catch (e) {
    console.log(`[stockfish] Error listing node_modules: ${e}`);
  }

  // 3. Last resort: try bare "stockfish" on PATH (local dev only)
  console.warn("[stockfish] No engine found via known paths or npm — falling back to bare PATH");
  cachedCommand = ["stockfish"];
  return cachedCommand;
}

const ANALYSIS_DEPTH = 12;
const ENGINE_TIMEOUT_MS = 10_000;

/**
 * Runs Stockfish at the given FEN and returns the best move + centipawn score.
 * Returns null if no engine is available or on timeout.
 */
let engineInitLogged = false;
let engineCallCount = 0;

export async function getBestMove(fen: string): Promise<EngineResult | null> {
  const cmd = getEngineCommand();
  if (!cmd) {
    if (!engineInitLogged) {
      console.warn("[stockfish] No engine found — checked system paths and npm package");
      engineInitLogged = true;
    }
    return null;
  }
  if (!engineInitLogged) {
    console.log(`[stockfish] Engine command: ${cmd.join(" ")}`);
    engineInitLogged = true;
  }

  engineCallCount++;
  const callId = engineCallCount;

  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(cmd[0], cmd.slice(1), {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      console.error(`[stockfish] Spawn failed: ${err instanceof Error ? err.message : err}`);
      resolve(null);
      return;
    }

    let bestMove = "";
    let cp = 0;
    let done = false;
    let gotAnyOutput = false;

    const finish = (result: EngineResult | null) => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        try {
          proc.kill();
        } catch {
          // ignore
        }
        if (!result && !gotAnyOutput) {
          console.error(`[stockfish] Call #${callId}: No output received from engine (likely crash or WASM load failure)`);
        }
        resolve(result);
      }
    };

    const timeout = setTimeout(() => {
      console.warn(`[stockfish] Call #${callId}: Timeout after ${ENGINE_TIMEOUT_MS}ms (gotOutput=${gotAnyOutput})`);
      finish(null);
    }, ENGINE_TIMEOUT_MS);

    let buf = "";
    proc.stdout!.on("data", (chunk: Buffer) => {
      gotAnyOutput = true;
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("info") && line.includes("score cp")) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          if (cpMatch) cp = parseInt(cpMatch[1], 10);
          const pvMatch = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/);
          if (pvMatch) bestMove = pvMatch[1];
        }
        if (line.startsWith("bestmove")) {
          const bmMatch = line.match(/bestmove ([a-h][1-8][a-h][1-8]\w?)/);
          if (bmMatch) bestMove = bmMatch[1];
          finish(bestMove ? { move: bestMove, cp } : null);
          return;
        }
      }
    });

    // Capture stderr for WASM load errors
    proc.stderr!.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) console.error(`[stockfish] stderr: ${msg.substring(0, 200)}`);
    });

    proc.on("error", (err) => {
      console.error(`[stockfish] Process error: ${err.message}`);
      finish(null);
    });

    proc.on("exit", (code) => {
      if (code !== null && code !== 0 && !done) {
        console.error(`[stockfish] Process exited with code ${code}`);
        finish(null);
      }
    });

    // Send UCI commands
    proc.stdin!.write("uci\n");
    proc.stdin!.write("isready\n");
    proc.stdin!.write(`position fen ${fen}\n`);
    proc.stdin!.write(`go depth ${ANALYSIS_DEPTH}\n`);
  });
}
