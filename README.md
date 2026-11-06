# GullyScorer (PitchLog) 🏏

A modern, fast, local-first Progressive Web App (PWA) for scoring gully, street, club, and tournament cricket matches — built with React, TypeScript, Tailwind CSS, Dexie (IndexedDB), and Supabase.

---

## ✨ Features

### 1. Pure Event-Sourced Scoring Engine
- **Local-first & 100% offline capable:** Works in remote grounds with zero network connectivity. All scoring writes immediately to IndexedDB and renders at 60fps.
- **Full cricket rule support:** Wides, no-balls, byes, leg-byes, penalty runs, custom dismissal types (bowled, caught, run out, stumped, lbw, hit wicket, retired hurt/out, obstructing field).
- **Custom gully rules:** Configurable overs per innings, squad sizes, runs for extras, re-bowling rules, last man stands, and super overs.
- **Undo & Redo:** Full historical rollback and replay of ball events without data corruption.

### 2. Shot Capture & Match Analytics
- **8-zone wagon wheel:** Optional shot zone capture relative to batter handedness.
- **Visual Analytics:**
  - **Manhattan Chart:** Over-by-over runs and wickets comparison.
  - **Worm Chart:** Cumulative run progression comparing both innings.
  - **Run Rate Graph:** Over-by-over required vs. current run rate.
  - **Wagon Wheel:** Shot distribution across 8 field sectors.
  - **Partnerships:** Detailed partnership breakdown for each wicket.

### 3. Voice-Assisted Scoring
- Natural voice commands (e.g. *"four runs through covers"*, *"wide ball plus one"*, *"wicket bowled"*) with offline natural language parsing and voice confirmation.

### 4. Player Profiles & Career Statistics
- Purely derived stats computed from ball events: batting average, strike rate, boundaries, milestones (30s, 50s, 100s), bowling average, economy, best bowling in innings (BBI), 3-fers, 5-fers, and MVP points ranking.
- Player deduplication: "Merge players" tool to reassign IDs and reconcile duplicate player records across matches.

### 5. Tournament & League Management
- **Formats:**
  - Single Round-Robin League
  - Double Round-Robin League
  - Groups + Knockout (Snake/Seeded/Random distribution, cross-pairing `A1 vs B2`)
  - Pure Knockout (Power-of-2 and non-power-of-2 with seeded byes, optional 3rd place playoff)
- **Base-6 Net Run Rate (NRR) Engine:** Mathematical calculation using exact legal deliveries ($\text{balls} / 6.0$), all-out quota penalties, chase ball adjustments, and super over exclusions. Includes an in-depth NRR Audit pop-up.
- **Knockout Bracket Progression:** Automatic winner and loser slot advancement.
- **Tournament Leaderboards:** Orange Cap (Runs), Purple Cap (Wickets), Most Sixes, and Tournament MVP standings.
- **Data Export:** Export fixtures and standings to CSV.

### 6. Cloud Sync, Live Match Links & Social Sharing
- **Idempotent Outbox Sync:** Background sync to Supabase with automatic retries; works seamlessly offline and queues edits until connectivity returns.
- **Live Match Viewers:** Public read-only live link (`/live/:token`) with ball-by-ball updates.
- **Public Tournament Hub:** Public read-only tournament link (`/t/:token`) with auto-polling.
- **Social Share Cards:** 1080×1350 Instagram / WhatsApp story-ready cards for Match Scorecards, Tournament Points Tables, and Fixture lists.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Storage:** Dexie.js (IndexedDB) for local source of truth
- **Backend / Cloud:** Supabase (PostgreSQL, Row Level Security, Realtime, Auth)
- **PWA:** `vite-plugin-pwa` with offline service worker
- **Testing:** Vitest (300+ unit, integration, and property-based tests)
- **Exports:** `html-to-image` for high-resolution graphics, CSV generators

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jishnunainani-creator/GullyScorer.git
   cd GullyScorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase project credentials in `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run database migrations:
   Execute the migration scripts in your Supabase SQL Editor:
   - `supabase/migrations/001_init.sql` (Profiles, Teams, Players, Matches, Ball Events, RLS)
   - `supabase/migrations/002_tournaments.sql` (Tournaments, Fixtures, Tournament Teams, Public RPC)

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Run the test suite:
   ```bash
   npm test -- --run
   ```

7. Build for production:
   ```bash
   npm run build
   ```

---

## 📜 License
MIT License.
