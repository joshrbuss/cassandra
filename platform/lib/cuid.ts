import { randomBytes } from "crypto";

/**
 * Generates a collision-resistant unique ID similar to cuid.
 * Uses Node.js `crypto.randomBytes` — safe for server-side use.
 */
export function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString("hex");
  return `c${timestamp}${random}`;
}
