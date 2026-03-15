/**
 * Copies the Stockfish WASM engine files from the npm package to public/.
 * Run automatically on `npm install` (prepare script) and before builds.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "stockfish", "bin");
const dest = path.join(__dirname, "..", "public");

const files = ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"];

for (const file of files) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log("Stockfish assets copied to public/");
