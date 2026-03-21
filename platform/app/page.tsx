import { Suspense } from "react";
import Link from "next/link";
import CassandraLogo from "@/components/CassandraLogo";
import ConfirmedToast from "@/components/marketing/ConfirmedToast";
import HeroBoard from "./HeroBoard";
import HeroForm from "./HeroForm";
import SocialLinks from "@/components/SocialLinks";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";

export default async function Home() {
  // Redirect logged-in users straight to their dashboard
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/home");
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Navbar ── */}
      <nav className="bg-[#0e0e0e] px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <CassandraLogo className="w-7 h-7" />
            <span className="text-white text-[17px]" style={{ fontFamily: "Georgia, serif" }}>
              Cassandra
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/learn"
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              Learn
            </Link>
            <Link
              href="/connect"
              className="text-gray-300 text-sm hover:text-white transition-colors hidden sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/connect"
              className="text-[#c8942a] text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-[#c8942a]/10 transition-colors"
              style={{ border: "0.5px solid #c8942a" }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-[#f9f7f4] px-4 sm:px-6 py-14 sm:py-20 flex-1">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left column */}
          <div>
            <h1
              className="text-[32px] sm:text-[40px] leading-[1.15] font-normal text-[#111] mb-5"
              style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
            >
              Turn your mistakes{"\n"}into progress.{" "}
              <span className="inline-block">&#9823;</span>
            </h1>

            <p className="text-[#666] text-[15px] leading-relaxed mb-8 max-w-md">
              Cassandra finds the mistakes in your games and turns them into puzzles personalised to you.
            </p>

            {/* How it works */}
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#999] font-semibold mb-4">
              How it works
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3.5 items-start">
                <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111]">Connect your account</p>
                  <p className="text-xs text-[#888] mt-0.5">Link your Chess.com or Lichess username. No payment required.</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111]">We do the work</p>
                  <p className="text-xs text-[#888] mt-0.5">Cassandra scans your recent games and pinpoints exactly where things went wrong — missed tactics, miscalculations, and positions that slipped away.</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <span className="w-6 h-6 rounded-full bg-[#c8942a] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111]">Start training</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#e5e5e5] mb-8" />

            {/* Begin training */}
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#999] font-semibold mb-4">
              Begin training
            </p>

            <HeroForm />
          </div>

          {/* Right column — animated board */}
          <div className="lg:sticky lg:top-8">
            <HeroBoard />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0e0e0e] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
          <SocialLinks variant="dark" />
          <div className="flex items-center justify-center gap-3 text-xs">
            <Link href="/privacy" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">Privacy</Link>
            <span className="text-[#444]">&middot;</span>
            <Link href="/terms" className="text-[#c8942a] hover:text-[#e0ad3a] transition-colors">Terms</Link>
            <span className="text-[#444]">&middot;</span>
            <CookiePreferencesLink />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#999] w-full">
            <p>&copy; 2026 Cassandra Chess</p>
            <p>Puzzles from the Lichess open database (CC0)</p>
          </div>
        </div>
      </footer>

      <Suspense>
        <ConfirmedToast />
      </Suspense>
    </main>
  );
}
