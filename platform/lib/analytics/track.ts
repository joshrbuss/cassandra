import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Record a first-party analytics event.
 *
 * Call from server actions / API routes. Fire-and-forget — never throws.
 */
export async function track(
  event: string,
  properties?: Record<string, unknown>,
  userId?: string,
  sessionId?: string,
) {
  try {
    await prisma.userEvent.create({
      data: {
        event,
        sessionId: sessionId ?? "anonymous",
        userId: userId ?? null,
        properties: (properties ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[analytics] track failed:", err);
  }
}
