import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTotalImportedCount } from "@/lib/jobs/importGames";
import LockedFeature from "@/components/LockedFeature";
import EmailSignup from "@/components/marketing/EmailSignup";
import AdSlot from "@/components/AdSlot";
import ReferralBar from "@/components/ReferralBar";
import { ensureReferralCode } from "@/lib/referral";
import { getT, resolveLocale, LOCALE_COOKIE } from "@/lib/i18n";
import SocialLinks from "@/components/SocialLinks";
import { countryToFlag } from "@/lib/countryFlag";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";
import LazySection from "@/components/LazySection";
import { hasCompletedProphecyToday, todayUtcMidnight } from "@/lib/prophecy";

import { GutterAds, EmailPopup, SyncButton, BackgroundAnalysisBar } from "./ClientShells";

export const metadata = {
  title: "Home — Cassandra Chess",
  description: "Your personalised chess puzzle dashboard. Train on your blunders, track your streak, and improve your game.",
  openGraph: { title: "Home — Cassandra Chess", description: "Your personalised chess puzzle dashboard." },
  twitter: { title: "Home — Cassandra Chess", description: "Your personalised chess puzzle dashboard." },
};

function displayName(u: { lichessUsername: string | null; chessComUsername: string | null }): string {
  return u.lichessUsername ?? u.chessComUsername ?? "Anonymous";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.userId) redirect("/connect");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      lichessUsername: true,
      chessComUsername: true,
      rawElo: true,
      normalizedElo: true,
      eloPlatform: true,
      elo: true,
      currentStreak: true,
      lastSyncedAt: true,
      lastPuzzleDate: true,
      referralCode: true,
      referralCount: true,
      email: true,
      country: true,
      isPaid: true,
    },
  });

  if (!user?.lichessUsername && !user?.chessComUsername) redirect("/connect");

  const name = user?.lichessUsername ?? user?.chessComUsername ?? "Player";
  const displayElo = user?.rawElo ?? user?.elo;

  const todayStart = todayUtcMidnight();

  const [totalImported, userAttempts, todayAttempts, streakLeaders, referralLeaders, prophecyDoneToday] = await Promise.all([
    user ? getTotalImportedCount(user.id) : Promise.resolve(0),
    user
      ? prisma.puzzleAttempt.findMany({
          where: { userId: user.id, attemptNumber: 1 },
          select: { success: true },
        })
      : Promise.resolve([]),
    user
      ? prisma.puzzleAttempt.findMany({
          where: { userId: user.id, attemptNumber: 1, createdAt: { gte: todayStart } },
          select: { success: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: { currentStreak: "desc" },
      take: 10,
      select: {
        id: true,
        lichessUsername: true,
        chessComUsername: true,
        currentStreak: true,
        country: true,
      },
    }),
    prisma.user.findMany({
      where: { referralCount: { gt: 0 } },
      orderBy: { referralCount: "desc" },
      take: 10,
      select: {
        id: true,
        lichessUsername: true,
        chessComUsername: true,
        referralCount: true,
        country: true,
      },
    }),
    user ? hasCompletedProphecyToday(user.id, user.elo) : Promise.resolve(false),
  ]);

  const totalSolved = userAttempts.filter((a) => a.success).length;
  const accuracy =
    userAttempts.length > 0
      ? Math.round((totalSolved / userAttempts.length) * 100)
      : null;

  const todaySolved = todayAttempts.filter((a) => a.success).length;
  const todayAccuracy =
    todayAttempts.length > 0
      ? Math.round((todaySolved / todayAttempts.length) * 100)
      : null;

  // Compute days away (lose streak)
  const todayDate = todayStart;
  const daysAway = user?.lastPuzzleDate
    ? Math.floor((todayDate.getTime() - new Date(user.lastPuzzleDate).getTime()) / 86_400_000)
    : 0;

  const referralCode = user ? await ensureReferralCode(user.id) : "";
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  const cookieStore = await cookies();
  const t = getT(resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value));

  return (
    <main className="min-h-screen bg-white">
      {/* ── Obsidian header ── */}
      <header className="bg-[#0e0e0e] pl-4 pr-14 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Avatar with gold border */}
              <div className="w-12 h-12 rounded-full border-2 border-[#c8942a] bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {name[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold text-lg">
                    {name}{countryToFlag(user?.country) ? ` ${countryToFlag(user?.country)}` : ""}
                  </h1>
                  <span className="text-[10px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t("dashboard.owner")}
                  </span>
                  {displayElo && (
                    <span className="text-xs text-gray-500">
                      {displayElo} {user?.eloPlatform === "lichess" ? "Lichess" : user?.eloPlatform === "chesscom" ? "Chess.com" : ""}
                    </span>
                  )}
                </div>
                <p className="text-[#c8942a] text-sm font-medium mt-0.5">
                  {t("dashboard.greeting", { name })}
                </p>
                {/* Connected accounts inline */}
                <div className="flex items-center gap-3 mt-1">
                  {user?.lichessUsername && (
                    <a
                      href={`https://lichess.org/@/${user.lichessUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Lichess: <span className="text-gray-400">{user.lichessUsername}</span>
                    </a>
                  )}
                  {user?.chessComUsername && (
                    <a
                      href={`https://www.chess.com/member/${user.chessComUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Chess.com: <span className="text-gray-400">{user.chessComUsername}</span>
                    </a>
                  )}
                  <Link href="/settings" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    {t("dashboard.manageAccounts")}
                  </Link>
                  <a href="/signout" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    {t("dashboard.signOut")}
                  </a>
                </div>
              </div>
            </div>

            {stripeLink && !user?.isPaid && (
              <a
                href={stripeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-3 py-1.5 rounded-full hover:bg-[#c8942a]/20 transition-colors shrink-0"
              >
                {t("dashboard.goAdFree")}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ── 4-column stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-[#c8942a] tabular-nums">{totalImported}</p>
            <p className="text-xs text-[#666] mt-1">{t("dashboard.statPuzzles")}</p>
          </div>
          <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-[#c8942a] tabular-nums">{user?.currentStreak ?? 0}</p>
            <p className="text-xs text-[#666] mt-1">{t("dashboard.statStreak")}</p>
          </div>
          <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4 text-center">
            {todayAttempts.length > 0 ? (
              <>
                <p className="text-2xl font-extrabold text-[#c8942a] tabular-nums">{todayAccuracy}%</p>
                <p className="text-xs text-[#666] mt-1">Today</p>
                <p className="text-xs text-[#777] mt-0.5">{todaySolved}/{todayAttempts.length} correct</p>
                {userAttempts.length > todayAttempts.length && (
                  <p className="text-[10px] text-[#999] mt-0.5">All-time {accuracy}%</p>
                )}
              </>
            ) : userAttempts.length > 0 ? (
              <>
                <p className="text-2xl font-extrabold text-[#c8942a] tabular-nums">{accuracy}%</p>
                <p className="text-xs text-[#666] mt-1">{t("dashboard.statAccuracy")}</p>
                <p className="text-xs text-[#777] mt-0.5">{totalSolved}/{userAttempts.length} {t("dashboard.correct")}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-[#c8942a]">—</p>
                <p className="text-xs text-[#666] mt-1">{t("dashboard.statAccuracy")}</p>
                <p className="text-xs text-[#777] mt-0.5">{t("dashboard.noAttemptsYet")}</p>
              </>
            )}
          </div>
          <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-[#c8942a] tabular-nums">{user?.referralCount ?? 0}</p>
            <p className="text-xs text-[#666] mt-1">{t("dashboard.statReferrals")}</p>
          </div>
        </div>

        {/* ── Background analysis progress + auto-sync for returning users ── */}
        <BackgroundAnalysisBar needsSync={!user?.lastSyncedAt || (Date.now() - user.lastSyncedAt.getTime()) > 24 * 60 * 60 * 1000} />

        {/* ── Lose streak warning ── */}
        {daysAway > 2 && (
          <div className="bg-[#0e0e0e] border border-[#c8942a]/30 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-2xl shrink-0">&#9888;&#65039;</span>
            <div>
              <p className="text-[#c8942a] font-semibold text-sm">
                You&apos;ve been away {daysAway} days
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Your blunders are waiting — get back to training!
              </p>
            </div>
            <Link href="/unlearned" className="ml-auto shrink-0 text-xs font-medium text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-3 py-1.5 rounded-full hover:bg-[#c8942a]/20 transition-colors">
              Train now
            </Link>
          </div>
        )}

        {/* ── Referral progress bar ── */}
        {referralCode && (
          <ReferralBar
            referralCode={referralCode}
            referralCount={user?.referralCount ?? 0}
          />
        )}

        {/* ── Actions: 2/3 Train + 1/3 Sync ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Link
            href="/unlearned"
            className="sm:col-span-2 flex items-center justify-between bg-[#0e0e0e] text-white rounded-xl p-5 hover:bg-[#1a1a1a] transition-colors"
          >
            <div>
              <p className="font-semibold text-white">{t("dashboard.theUnlearned")}</p>
              <p className="text-xs text-[#c8942a] mt-1">
                {totalImported > 0
                  ? t("dashboard.trainDesc.has", { count: totalImported })
                  : t("dashboard.trainDesc.empty")}
              </p>
            </div>
            <span className="text-white/40 text-xl ml-3">&#8594;</span>
          </Link>

          <div className="sm:col-span-1 bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4 flex flex-col justify-center">
            <SyncButton lastSyncedAt={user?.lastSyncedAt?.toISOString() ?? null} isFirstSync={totalImported === 0} username={user?.chessComUsername ?? user?.lichessUsername ?? null} />
          </div>
        </div>

        {/* ── Cassandra's Prophecy card ── */}
        <Link
          href={prophecyDoneToday ? "/prophecy?replay=true" : "/prophecy"}
          className={`flex items-center justify-between rounded-xl p-5 mb-4 transition-colors border ${
            prophecyDoneToday
              ? "bg-[#0e0e0e]/60 border-[#2a2a2a]/50 opacity-70 hover:opacity-90"
              : "bg-[#0e0e0e] border-[#2a2a2a] hover:bg-[#1a1a1a]"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-semibold ${prophecyDoneToday ? "text-gray-400" : "text-[#c8942a]"}`}>
                Cassandra&apos;s Prophecy
              </p>
              <span className="text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
              </span>
              {prophecyDoneToday && (
                <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-1.5 py-0.5 rounded-full uppercase">
                  Completed
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {prophecyDoneToday
                ? "You found the brilliant move. Tap to replay."
                : "Today\u2019s brilliant move \u2014 can you find what Cassandra saw?"}
            </p>
          </div>
          <span className={`text-sm font-medium ml-3 whitespace-nowrap ${prophecyDoneToday ? "text-gray-500" : "text-[#c8942a]"}`}>
            {prophecyDoneToday ? "Replay \u2192" : "Accept the prophecy \u2192"}
          </span>
        </Link>

        {/* ── The Scales ── */}
        <Link
          href="/scales"
          className="flex items-center justify-between bg-[#0e0e0e] text-white rounded-xl p-5 mb-4 hover:bg-[#1a1a1a] transition-colors border border-[#2a2a2a]"
        >
          <div>
            <p className="font-semibold text-white">{t("home.scales.title")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t("home.scales.desc")}
            </p>
          </div>
          <span className="text-white/40 text-xl ml-3">&#8594;</span>
        </Link>

        {/* ── The Echo ── */}
        <Link
          href="/echo"
          className="flex items-center justify-between bg-[#0e0e0e] text-white rounded-xl p-5 mb-4 hover:bg-[#1a1a1a] transition-colors border border-[#2a2a2a]"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">&#127754;</span>
            <div>
              <p className="font-semibold text-white">The Echo</p>
              <p className="text-xs text-gray-400 mt-0.5">
                See a position and figure out what move was just played
              </p>
            </div>
          </div>
          <span className="text-white/40 text-xl ml-3">&#8594;</span>
        </Link>

        {/* ── Learn articles ── */}
        <Link
          href="/learn"
          className="flex items-center justify-between bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-5 mb-4 hover:border-[#c8942a] transition-colors"
        >
          <div>
            <p className="font-semibold text-[#1a1a1a]">Learn Chess Tactics</p>
            <p className="text-xs text-[#777] mt-1">
              Free guides on puzzles, blunder training, and pattern recognition
            </p>
          </div>
          <span className="text-[#999] text-xl ml-3">&#8594;</span>
        </Link>

        {/* MVP: hidden until library UX is improved
        <Link
          href="/puzzles"
          className="flex items-center justify-between bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-5 mb-6 hover:border-[#c8942a] transition-colors"
        >
          <div>
            <p className="font-semibold text-[#1a1a1a]">{t("dashboard.browseAll")}</p>
            <p className="text-xs text-[#777] mt-1">{t("dashboard.browseDesc")}</p>
          </div>
          <span className="text-[#999] text-xl ml-3">&#8594;</span>
        </Link>
        */}

        {/* ── Two leaderboard panels (lazy loaded — below the fold) ── */}
        <LazySection minHeight={200}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* Streak leaders */}
            <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">{t("dashboard.streakLeaders")}</h3>
              {streakLeaders.length === 0 ? (
                <p className="text-xs text-[#777] italic">{t("dashboard.noStreaksYet")}</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {(() => {
                      let rank = 0;
                      let prev: number | null = null;
                      return streakLeaders.map((entry) => {
                      if (entry.currentStreak !== prev) { rank++; prev = entry.currentStreak; }
                      const isOwner = entry.id === session.userId;
                      return (
                        <tr key={entry.id} className={isOwner ? "bg-[#c8942a]/10" : ""}>
                          <td className="py-1.5 pr-2 text-[#666] w-6">
                            {rank === 1 ? "\uD83D\uDC51" : `#${rank}`}
                          </td>
                          <td className="py-1.5 pr-2">
                            <span className={`font-medium ${isOwner ? "text-[#1a1a1a]" : "text-[#1a1a1a]"}`}>
                              {displayName(entry)}
                            </span>
                            {countryToFlag(entry.country) && (
                              <span className="ml-1">{countryToFlag(entry.country)}</span>
                            )}
                            {isOwner && (
                              <span className="ml-1.5 text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase">
                                {t("dashboard.owner")}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-[#c8942a]">
                            {entry.currentStreak}d
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top referrers */}
            <div className="bg-[#eeebe6] border border-[#d8d4ce] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">{t("dashboard.topReferrers")}</h3>
              {referralLeaders.length === 0 ? (
                <p className="text-xs text-[#777] italic">{t("dashboard.noReferralsYet")}</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {(() => {
                      let rank = 0;
                      let prev: number | null = null;
                      return referralLeaders.map((entry) => {
                      if (entry.referralCount !== prev) { rank++; prev = entry.referralCount; }
                      const isOwner = entry.id === session.userId;
                      return (
                        <tr key={entry.id} className={isOwner ? "bg-[#c8942a]/10" : ""}>
                          <td className="py-1.5 pr-2 text-[#666] w-6">
                            {rank === 1 ? "\u2B50" : `#${rank}`}
                          </td>
                          <td className="py-1.5 pr-2">
                            <span className="font-medium text-[#1a1a1a]">
                              {displayName(entry)}
                            </span>
                            {countryToFlag(entry.country) && (
                              <span className="ml-1">{countryToFlag(entry.country)}</span>
                            )}
                            {isOwner && (
                              <span className="ml-1.5 text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase">
                                {t("dashboard.owner")}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-[#c8942a]">
                            {entry.referralCount}
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </LazySection>

        {/* ── Ad slot / paid thank-you ── */}
        <div className="mb-6">
          <AdSlot slot="1234567890" isPaid={!!user?.isPaid} />
        </div>

        {/* ── Coming soon (lazy loaded — well below the fold) ── */}
        <LazySection minHeight={300}>
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">{t("dashboard.comingSoon")}</h2>
            <div className="grid grid-cols-1 gap-3">
              <LockedFeature
                emoji="🧠"
                name="Smart Review"
                description="Puzzles you struggle with resurface at the perfect moment. Powered by spaced repetition."
              />
              <LockedFeature
                emoji="📖"
                name="Opening Trainer"
                description="Master your opening repertoire with targeted drills"
              />
              <LockedFeature
                emoji="⚔️"
                name={t("home.trials.title")}
                description={t("home.trials.desc")}
              />
            </div>
            <div className="mt-4">
              <EmailSignup source="coming_soon_unified" headline={t("comingSoon.notifyHeadline")} cta={t("comingSoon.notifyCta")} />
            </div>
          </div>
        </LazySection>

        {/* ── Footer ── */}
        <footer className="mt-10 pt-6 border-t border-[#333] text-center space-y-3 bg-[#0e0e0e] rounded-xl p-6">
          <SocialLinks variant="dark" />
          <div className="flex items-center justify-center gap-3 text-xs">
            <Link href="/privacy" className="text-[#c8942a]/70 hover:text-[#c8942a] transition-colors">{t("legal.privacy")}</Link>
            <span className="text-[#444]">·</span>
            <Link href="/terms" className="text-[#c8942a]/70 hover:text-[#c8942a] transition-colors">{t("legal.terms")}</Link>
            <span className="text-[#444]">·</span>
            <CookiePreferencesLink />
          </div>
          <p className="text-xs text-[#666]">
            {t("dashboard.footer")}
          </p>
        </footer>
      </div>

      {/* Desktop gutter house ads (free users only) */}
      {!user?.isPaid && <GutterAds stripeLink={stripeLink} />}

      {/* Email capture popup — shown once per session for users without email who have solved 3+ puzzles */}
      <EmailPopup
        hasNoEmail={!user?.email}
        hasEnoughAttempts={userAttempts.length >= 3}
      />
    </main>
  );
}
