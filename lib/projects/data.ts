export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  intro: string;
  challenge: string;
  role: string;
  contributions: string[];
  technologies: string[];
  impact: string;
  tags: string[];
  url?: string;
}

export const projects: Project[] = [
  {
    slug: "estimate",
    title: "EstiMate: Cut Estimation Time 50% for 500+ Employee Contractor",
    subtitle: "B2B Internal Tool for Warehouse Equipment Installation",
    date: "2026-01-15",
    intro:
      "A 500-employee warehouse equipment contractor was running their entire estimation process on spreadsheets. Every bid required manually calculating labor, travel, permits, equipment rental, and project management costs across dozens of line items. Estimates took hours and errors were costing the company millions in margin leakage annually.",
    challenge:
      "The estimation workflow touched five cost categories with different unit types (hours, days, trips, flat fees), needed template support for common installation types (pallet racks, conveyors, mezzanines, dock doors, robotics), and had to track estimates through a multi-stage approval pipeline. The tool needed to be fast enough that estimators would actually use it instead of falling back to Excel.",
    role: "Sole Developer — Full-Stack Design, Development & Delivery",
    contributions: [
      "Built a template-driven estimation engine with 5 pre-loaded industry templates and real-time line item calculations",
      "Designed a 5-stage workflow (draft → review → sent → accepted/rejected) with validation to prevent invalid state transitions",
      "Implemented search, filtering, and estimate duplication for rapid creation of similar projects",
      "Created a print-ready view for client-facing estimate delivery",
      "Documented ROI model showing $1-4M annual value from reduced estimation errors and time savings",
    ],
    technologies: [
      "Next.js 14",
      "TypeScript",
      "Prisma ORM",
      "SQLite",
      "Tailwind CSS",
      "shadcn/ui",
    ],
    impact:
      "Reduced estimation time by approximately 50% compared to the spreadsheet-based process. Standardized estimation across the team, capturing institutional knowledge in reusable templates. The tool's documented value proposition of $1-4M annually in reduced margin leakage made the business case straightforward for a PE-backed company focused on operational efficiency.",
    tags: [
      "next.js",
      "typescript",
      "b2b",
      "internal-tools",
      "prisma",
      "full-stack",
      "enterprise",
    ],
  },
  {
    slug: "circus-archives",
    title: "Circus Archives: Production Video Platform with CI/CD Pipeline",
    subtitle: "Community Video Archive for FSU Flying High Circus Alumni",
    date: "2025-12-01",
    intro:
      "The FSU Flying High Circus has decades of performance history scattered across personal collections with no central place to preserve or discover it. Alumni wanted a way to share, organize, and celebrate these performances before the footage was lost.",
    challenge:
      "Video is expensive to host and hard to upload reliably. The platform needed to handle files up to 2GB from browsers without timing out, automatically publish to YouTube for free hosting, support community-driven organization (voting, tagging, categorization), and be simple enough for non-technical alumni to use.",
    role: "Sole Developer — Full-Stack Development & DevOps",
    contributions: [
      "Built chunked video upload system handling files up to 2GB directly from the browser using Vercel Blob",
      "Created an automated YouTube publishing pipeline using GitHub Actions CI/CD",
      "Designed a weighted community voting system for surfacing the best content",
      "Implemented performer tagging, multi-act categorization, and threaded comments",
      "Set up authentication with NextAuth.js and deployed on Vercel + Railway",
    ],
    technologies: [
      "Next.js 16",
      "TypeScript",
      "PostgreSQL",
      "Prisma ORM",
      "Vercel Blob",
      "GitHub Actions",
      "NextAuth.js",
      "Tailwind CSS",
    ],
    impact:
      "Live in production at flyinghighcircusarchives.com with active users contributing content. Alumni from multiple decades have uploaded and organized performances that were previously inaccessible. The automated YouTube pipeline eliminated manual upload work entirely.",
    tags: [
      "next.js",
      "typescript",
      "postgresql",
      "video",
      "ci-cd",
      "github-actions",
      "vercel",
      "production",
    ],
    url: "https://flyinghighcircusarchives.com",
  },
  {
    slug: "swaddle",
    title: "Swaddle: 30+ MCP Tools Connecting Claude AI to Spotify",
    subtitle: "MCP Server for Natural Language Playlist Curation",
    date: "2025-12-30",
    intro:
      "I wanted to manage my Spotify library through conversation instead of clicking through menus. Describe what you want — \"make me a workout playlist with high-energy tracks from my library\" — and Claude handles the rest.",
    challenge:
      "Spotify's API requires OAuth 2.0 with automatic token refresh, rate limiting to avoid getting blocked, and intelligent caching to avoid re-fetching thousands of tracks on every query. The MCP server needed to sync a full music library (700+ tracks with 13 audio feature metrics each) to a local database for fast search, while exposing clean tools that Claude could use without hallucinating.",
    role: "Sole Developer — AI Tooling & API Integration",
    contributions: [
      "Built 6 MCP tools: sync liked songs, search library, search Spotify catalog, create playlists, get sync status, and get library count",
      "Implemented full OAuth 2.0 flow with automatic token refresh and secure credential storage",
      "Designed PostgreSQL schema caching 13 audio features per track (danceability, energy, valence, tempo, etc.) for intelligent search",
      "Added rate limiting and batched API calls to stay within Spotify's limits",
      "This is one of 30+ production MCP tools I've built across multiple projects",
    ],
    technologies: [
      "Node.js",
      "MCP SDK",
      "PostgreSQL",
      "Spotify Web API",
      "OAuth 2.0",
    ],
    impact:
      "Fully functional MCP server that turns Claude Desktop into a Spotify power tool. Search, discover, and create playlists entirely through natural language. The caching layer means library searches are instant instead of waiting for API round-trips.",
    tags: [
      "mcp",
      "ai-tooling",
      "spotify",
      "oauth",
      "postgresql",
      "node.js",
      "api-integration",
    ],
  },
  {
    slug: "pallet",
    title: "Pallet: Smart Meal Planner with Live Kroger API Integration",
    subtitle: "Grocery Planning App with 5-Factor Recommendation Engine",
    date: "2026-02-01",
    intro:
      "My wife and I were spending too much on groceries through Hungry Root. We wanted to shop at Harris Teeter, eat seasonally, and actually save money — but planning meals around what's on sale and in season is tedious work.",
    challenge:
      "The app needed to connect to a real grocery store API (Kroger/Harris Teeter) for live product search and pricing, factor in seasonality data for NC Piedmont region produce, generate meal plans that balanced multiple competing priorities (cost, variety, nutrition, user preferences), and send shopping lists directly to a store cart for checkout.",
    role: "Sole Developer — Full-Stack Development & API Integration",
    contributions: [
      "Built a 5-factor recommendation engine weighing seasonality (0.25), active sales (0.3), variety (0.2), user ratings (0.15), and budget (0.1)",
      "Integrated Kroger API with OAuth for account linking, product search, and direct cart additions via UPC",
      "Pre-loaded 45 NC Piedmont seasonal produce items with 4-level availability scoring",
      "Implemented 23 API routes covering auth, recipes, meal plans, shopping lists, and store integration",
      "Built recipe import from Hungry Root format for easy migration",
    ],
    technologies: [
      "Next.js 14",
      "TypeScript",
      "PostgreSQL",
      "Prisma ORM",
      "Supabase Auth",
      "Kroger API",
      "Tailwind CSS",
      "shadcn/ui",
    ],
    impact:
      "Working meal planning app that generates weekly plans, auto-creates shopping lists, and sends items directly to a Harris Teeter cart. The recommendation engine surfaces recipes based on what's actually cheap and in season right now, not just what's popular.",
    tags: [
      "next.js",
      "typescript",
      "api-integration",
      "kroger",
      "supabase",
      "recommendation-engine",
      "full-stack",
    ],
  },
  {
    slug: "podcast-ai",
    title: "PodcastAI: Fully Automated Podcast Generation Pipeline",
    subtitle: "Topic to Published Episode via Telegram Bot",
    date: "2026-02-15",
    intro:
      "Producing a podcast episode typically costs $500-2,000 and takes hours of recording, editing, and post-production. I built a system that generates a complete episode — research, script, audio, transcription, and publishing — from a single Telegram command.",
    challenge:
      "The pipeline needed to chain 8 distinct steps reliably: topic research with Claude, two-host script generation, high-quality voice synthesis for both hosts, audio stitching, transcription with word-level alignment, metadata generation, cloud upload, and RSS publishing. Each step could fail independently, and the system needed to report progress and support cancellation mid-pipeline.",
    role: "Sole Developer — AI Pipeline Architecture & Deployment",
    contributions: [
      "Designed an 8-step pipeline: research → script → TTS → stitch → transcode → transcribe → metadata → publish",
      "Integrated Claude CLI for interactive research and script generation with user feedback loops",
      "Implemented high-quality dual-voice synthesis using Kokoro TTS (ONNX model)",
      "Added WhisperX transcription with word-level alignment and speaker diarization",
      "Built job queue with Telegram progress updates, cancellation support, and episode numbering persistence",
      "Deployed as systemd service on Linux with rsync deployment pipeline",
    ],
    technologies: [
      "Node.js",
      "TypeScript",
      "Claude CLI",
      "Kokoro TTS",
      "WhisperX",
      "Cloudflare R2",
      "Telegram Bot API",
      "systemd",
    ],
    impact:
      "Generates complete podcast episodes end-to-end from a single command. Episodes include two distinct AI hosts, professional-quality audio, full transcriptions with timestamps, and automatic publishing to a portfolio site with RSS distribution. Runs on modest infrastructure with no per-episode cloud costs beyond storage.",
    tags: [
      "ai-pipeline",
      "tts",
      "transcription",
      "automation",
      "typescript",
      "telegram",
      "deployment",
    ],
  },
  {
    slug: "game-sense",
    title: "GameSense: Automated Beach Volleyball Intelligence Platform",
    subtitle: "Sports Analytics with Playwright Scraping & Live Match Tracking",
    date: "2026-03-01",
    intro:
      "Professional beach volleyball statistics are locked behind the FIVB website with no public API. I needed a way to automatically collect, structure, and analyze match data to power a YouTube analytics channel.",
    challenge:
      "The FIVB site is a dynamic SPA with overlays, cookie banners, and tabbed interfaces that change state between data loads. Extracting box scores across 5 skill categories for both teams required navigating complex DOM states, detecting data contamination between teams, and retrying with stabilization when validation failed. The data model needed to support players, tournaments, matches, per-skill statistics, video segments, and point-by-point tracking.",
    role: "Sole Developer — Full-Stack Development & Data Engineering",
    contributions: [
      "Built a Playwright scraper with exponential backoff, multi-selector fallback strategies, and cross-contamination detection",
      "Designed a 12-table PostgreSQL schema covering players, tournaments, matches, stats, video segments, and transcripts",
      "Created a live match tracker with point-by-point recording, court zone visualization, and bracket-aware scoring (21/15 sets, side-switching)",
      "Implemented a discover → filter → scrape → summary batch pipeline with upsert-based idempotency",
      "Built the frontend dashboard with Next.js and Radix UI for browsing players, tournaments, and match statistics",
    ],
    technologies: [
      "Next.js 16",
      "TypeScript",
      "PostgreSQL",
      "Playwright",
      "Python",
      "OpenCV",
      "Radix UI",
    ],
    impact:
      "Automated collection of professional beach volleyball statistics that were previously only available through manual data entry. The scraper handles the full FIVB tournament schedule with resilient error recovery and deduplication. The live tracker enables real-time match analysis with zone-based shot tracking for YouTube content production.",
    tags: [
      "web-scraping",
      "playwright",
      "sports-analytics",
      "postgresql",
      "next.js",
      "data-engineering",
      "automation",
    ],
  },
];
