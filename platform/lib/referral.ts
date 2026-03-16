import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/** Generate a unique 8-char alphanumeric referral code. */
export function generateReferralCode(): string {
  // 6 random bytes → 12 hex chars → take first 8
  return randomBytes(6).toString("hex").slice(0, 8);
}

/** Ensure a user has a referral code; generate one if missing. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (user?.referralCode) return user.referralCode;

  // Generate and retry on collision (unique constraint)
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") continue; // unique violation, retry
      throw err;
    }
  }
  throw new Error("Failed to generate unique referral code");
}

const REFERRAL_THRESHOLD = 5;

/**
 * Credit the referrer when a referred user connects an account.
 * Increments referralCount and auto-grants isPaid at threshold.
 */
export async function creditReferrer(referredByCode: string): Promise<void> {
  const referrer = await prisma.user.findUnique({
    where: { referralCode: referredByCode },
    select: { id: true, referralCount: true },
  });
  if (!referrer) return;

  const newCount = referrer.referralCount + 1;
  await prisma.user.update({
    where: { id: referrer.id },
    data: {
      referralCount: newCount,
      ...(newCount >= REFERRAL_THRESHOLD ? { isPaid: true } : {}),
    },
  });
}
