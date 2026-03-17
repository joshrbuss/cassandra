#!/usr/bin/env node
/**
 * scrape_chess_complaints.js
 *
 * Standalone script — NOT part of the Next.js app.
 * Queries Reddit's public JSON API for chess puzzle frustration posts
 * and outputs a structured complaints_report.json.
 *
 * Run: node scripts/scrape_chess_complaints.js
 * Output: scripts/complaints_report.json
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT_FILE = path.join(__dirname, "complaints_report.json");

const SUBREDDITS = ["chess", "chessbeginners", "chesscom"];

const SEARCH_TERMS = [
  "chess puzzles are",
  "hate chess puzzles",
  "puzzle trainer is",
  "tactics trainer",
  "chess puzzle complaints",
];

const USER_AGENT =
  "Cassandra Chess Research Bot/1.0 (research project; contact: research@cassandra-chess.com)";

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch a URL and return parsed JSON */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error for ${url}: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

/** Extract a one-line key complaint from post title + selftext */
function extractKeyComplaint(title, selftext) {
  const combined = `${title} ${selftext ?? ""}`.toLowerCase();

  const COMPLAINT_PATTERNS = [
    { pattern: /too (hard|difficult|frustrat)/i, complaint: "Puzzles are too hard or frustrating" },
    { pattern: /don'?t (make sense|understand|get it)/i, complaint: "Puzzle solutions are unclear or unexplained" },
    { pattern: /random|no pattern|can'?t see/i, complaint: "Tactics feel random or unpredictable" },
    { pattern: /time (limit|pressure|out)/i, complaint: "Time pressure makes puzzles stressful" },
    { pattern: /boring|repetitive|same/i, complaint: "Puzzle variety is lacking" },
    { pattern: /(wrong|incorrect) solution|disagree/i, complaint: "Puzzles have questionable or wrong solutions" },
    { pattern: /not (improving|getting better|progress)/i, complaint: "Puzzles don't feel like they drive improvement" },
    { pattern: /rating (drop|loss|fall)/i, complaint: "Puzzle ratings are discouraging" },
    { pattern: /interface|ui|ux|app|website/i, complaint: "Trainer interface or UX issues" },
    { pattern: /beginner|new|start/i, complaint: "Puzzles are not beginner-friendly" },
  ];

  for (const { pattern, complaint } of COMPLAINT_PATTERNS) {
    if (pattern.test(combined)) return complaint;
  }

  // Fallback: truncate title
  return title.length > 100 ? `${title.slice(0, 97)}…` : title;
}

/** Fetch posts for a single subreddit + search term */
async function fetchPosts(subreddit, query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&sort=top&limit=25&restrict_sr=1`;

  try {
    const json = await fetchJson(url);
    const posts = json?.data?.children ?? [];

    return posts.map((child) => {
      const post = child.data;
      return {
        source: `r/${subreddit}`,
        post_title: post.title,
        url: `https://www.reddit.com${post.permalink}`,
        upvotes: post.score ?? 0,
        created_utc: new Date((post.created_utc ?? 0) * 1000).toISOString().slice(0, 10),
        key_complaint: extractKeyComplaint(post.title, post.selftext),
        search_term: query,
      };
    });
  } catch (err) {
    console.error(`  Error fetching r/${subreddit} query "${query}": ${err.message}`);
    return [];
  }
}

async function main() {
  console.log("Cassandra Chess — Forum Complaint Scraper");
  console.log(`Output: ${OUTPUT_FILE}\n`);

  const allPosts = [];
  const seen = new Set();

  for (const subreddit of SUBREDDITS) {
    for (const term of SEARCH_TERMS) {
      console.log(`Fetching r/${subreddit} — "${term}"…`);

      const posts = await fetchPosts(subreddit, term);

      for (const post of posts) {
        // Deduplicate by URL
        if (!seen.has(post.url)) {
          seen.add(post.url);
          allPosts.push(post);
        }
      }

      console.log(`  Found ${posts.length} posts (${seen.size} unique so far)`);

      // Rate limit: 1 request per second minimum
      await sleep(1100);
    }
  }

  // Sort by upvotes descending
  allPosts.sort((a, b) => b.upvotes - a.upvotes);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPosts, null, 2), "utf8");

  console.log(`\nDone. ${allPosts.length} unique posts written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
