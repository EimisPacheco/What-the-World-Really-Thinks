# What the World Really Thinks

**Talk to your dashboard and watch the world's opinions render in real time — AI-powered global perspective analysis, built on Amazon Aurora PostgreSQL and Vercel.**

## Have you ever talked to your dashboard?

Most people haven't. Now imagine asking *"What does China really think about climate change?"* out loud — and watching a live map analyze, think, and answer across dozens of countries in seconds. That's **What the World Really Thinks**: a voice-driven, AI-powered explorer of global opinion, with a **Vercel** front-end shipped in minutes and an **Amazon Aurora PostgreSQL** back-end designed for scale.

This is the **"Zero Stack"** in action: front-end in minutes, back-end built for millions.

## Inspiration

The same question gets radically different answers depending on where in the world you ask it. Cultural context shapes belief, yet we rarely see those perspectives side by side. I wanted a tool that could instantly reveal global consensus and cultural divides on *any* topic — just by talking to it.

This project began life as **"Ask the World Anything,"** which won **Best Use of Actionable Analytics** at the Tableau Hackathon 2025. For **H0: Hack the Zero Stack with Vercel v0 and AWS Databases**, I re-architected it from the ground up — moving the data layer onto **Amazon Aurora PostgreSQL (Serverless v2)** and shipping the whole experience on **Vercel** — to prove the concept can scale from a single dashboard to a global, production-grade application.

## What it does

**What the World Really Thinks** combines the **Perplexity API**, **ElevenLabs Voice Agents**, **Amazon Aurora PostgreSQL**, and **Tableau** into a conversational analytics experience.

Speak a question like:
- *"Analyze: Social media makes people less connected"*
- *"What do the United States, Canada, and Mexico think about vaccines?"*
- *"Analyze climate change in China, India, and Japan"*

The system:
1. **Listens** to your voice via ElevenLabs Conversational AI.
2. **Extracts** the question *and* the country names from natural speech.
3. **Analyzes** each country's stance with the Perplexity Sonar model.
4. **Writes** the results to **Amazon Aurora PostgreSQL**.
5. **Auto-refreshes** the Tableau dashboard over a Live connection — no clicks, no extracts.

You get an interactive world map colored by agreement, a **Global Truth Index (0–100)**, per-country stance scores, percentage breakdowns, and the **cultural factors** that explain *why* each country holds its view.

## How I built it

### The AWS database: Amazon Aurora PostgreSQL (the scalable backbone)
The heart of the H0 build is the data layer. Every voice or button-triggered analysis runs through a **Vercel serverless function**, calls Perplexity, then writes a wide-format result set into **Amazon Aurora PostgreSQL (Serverless v2)**:

- **Designed for scale** — Serverless v2 auto-scales compute with demand. Today it powers one dashboard; the same cluster scales to millions of "global perspective" queries with no re-architecture.
- **Live, zero-latency analytics** — Tableau connects to Aurora over a native PostgreSQL **Live** connection, so a voice-triggered analysis appears on the dashboard the instant it's written.
- **Managed & secure** — multi-AZ subnet group, automated backups, and TLS-encrypted connections, with zero database servers to manage.
- **Data model** — a `world_perspectives_sample` table (one row per country) holding the question, stance, 0–100 score, agree/mixed/disagree percentages, three cultural factors, and geo coordinates.

**Architecture:** `Voice → ElevenLabs → Vercel serverless function → Perplexity (Sonar) → Amazon Aurora PostgreSQL → Tableau (Live)`.

### Backend (Node.js / Express on Vercel)
- **Vercel serverless functions** with a 60-second timeout for long-running AI operations.
- **Perplexity API (Sonar)** — culturally-nuanced, structured JSON analysis across up to 52 countries.
- **`pg` connection pool** to Aurora, writing inside a transaction (clear previous analysis, bulk-insert the new one).
- **ElevenLabs webhook** endpoint (`/api/voice-analyze`) that runs the analysis synchronously and reports status.

### Frontend
- **Tableau dashboard** + **Extensions API** for the interactive map and auto-refresh.
- **ElevenLabs Conversational AI** widget that extracts the question and country names via LLM.
- **Dual-window status sync** — voice popup and main dashboard show "Analyzing…" → "Complete!" together, coordinated with `window.opener.postMessage()`.

## Challenges I ran into

1. **Re-platforming the database for H0.** The original ran on MySQL, which isn't an eligible H0 database. I migrated the data layer to **Amazon Aurora PostgreSQL**, converting the writer to the `pg` driver and PostgreSQL parameterized inserts. To keep it honest, I extracted the SQL builder into a pure function and added a **unit-test suite (18 tests)** covering placeholder math, multi-row inserts, and the data transforms — then verified the full Vercel → Aurora write path in production.
2. **Tableau API context limits.** The Extensions API only runs in the main window. I bridged the voice popup to the dashboard with `window.opener.postMessage()` to trigger `refreshAsync()`.
3. **Voice webhook timeouts.** AI analysis takes 30–60s; ElevenLabs timed out at 20s. I extended the webhook timeout to 60s and made the endpoint synchronous.
4. **Country name → code mapping.** Users say "United States"; the model needs "US". A normalization layer handles any capitalization, spacing, or full-name/abbreviation variation.

## Accomplishments that I'm proud of

- **A conversational Tableau dashboard re-architected for the cloud** — voice in, AI analysis, Aurora-backed, auto-refreshing out.
- **A deliberate, production-grade AWS data layer** — Aurora Serverless v2 with a Live Tableau connection and transactional writes, verified end-to-end in production.
- **Engineering rigor** — a pure, unit-tested INSERT builder and an 18-test suite guarding the migration.
- **Pushed Perplexity** to return consistent, structured cultural analysis across up to 52 countries.

## What I learned

- **Voice changes everything** — adding conversational input fundamentally transforms how people interact with data.
- **The database choice is a design decision, not plumbing** — moving to Aurora Serverless v2 turned a hackathon prototype into something that genuinely scales.
- **Prompt engineering is software engineering** — structured, reliable LLM output takes the same rigor as code.
- **Truth is contextual** — the same statement can be simultaneously accepted and contested depending on culture.

## What's next for What the World Really Thinks

- **Historical tracking** — store analyses over time in Aurora to watch global opinion shift.
- **pgvector semantic search** — "show me past analyses similar to this one."
- **Multi-language voice** — ElevenLabs supports 29 languages; analyze in users' native tongues.
- **Regional & comparative analysis** — by continent, economic bloc, or side-by-side cultural factors.
- **Research & policy tooling** — cross-cultural studies and initiative reception modeling.

## Why this project deserves to win (mapped to H0 judging)

- **Technological Implementation** — a deliberate Aurora PostgreSQL data model with transactional writes, a Live Tableau connection, Vercel serverless orchestration, and a unit-tested migration.
- **Design** — a genuinely novel, hands-free conversational UX with synchronized multi-window status and automatic refresh.
- **Impact & Real-world Applicability** — education, journalism, market research, and policy all need fast, explainable global sentiment; Serverless v2 makes it viable at scale.
- **Originality** — a voice-driven, AI-analyzed, Aurora-backed global perspective engine — an evolution of an award-winning concept, rebuilt for the Zero Stack.

## Built With

`amazon-aurora` · `amazon-web-services` · `postgresql` · `vercel` · `node.js` · `express` · `perplexity-api` · `elevenlabs` · `tableau` · `javascript`

## Try it out

- 🌐 **Live app (Vercel):** https://what-the-world-really-thinks.vercel.app
