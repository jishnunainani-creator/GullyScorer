# PitchLog Architectural and Rule Decisions

This document records the design and rules decisions implemented in the PitchLog Cricket Scoring Engine.

## 1. Event Sourcing Architecture
- **Decision:** Every ball bowled is stored as an immutable `BallEvent`.
- **Rationale:** Cricket matches require frequent edits and undos. By computing all match states (scores, wickets, overs, striker/non-striker positions, bowler stats, batter stats, partnerships, chase info) purely from the list of events, we eliminate out-of-sync state bugs. Undo is simply removing the last event and re-deriving.

## 2. Innings Scoping for Undo
- **Decision:** `undoLast(events, inningsNo)` only removes the most recent ball belonging to the specified `inningsNo`.
- **Rationale:** When viewing or editing an innings, an undo action must never accidentally delete a ball from another innings (e.g. undoing while viewing Innings 2 must never delete an event from Innings 1).

## 3. Legal Deliveries vs Illegal Deliveries
- **Wides:**
  - If `config.wideReBowl` is `true` (standard cricket rules), a wide is **not** a legal delivery. It does not count towards the 6 balls of the over, and does not increment `legalBalls`.
  - If `config.wideReBowl` is `false` (gully/street cricket variation), wide counts as a legal delivery.
- **No-Balls:**
  - A no-ball is **never** a legal delivery; it must be re-bowled. It does not increment `legalBalls` or count towards the 6 balls of the over.
- **Byes & Leg-Byes:**
  - Byes and leg-byes are legal deliveries bowled to the batter; they count towards the 6 balls of the over.

## 4. Free Hit on No-Ball
- **Decision:** When `config.noBallFreeHit` is `true`, a no-ball causes the next legal delivery to be a Free Hit.
- **Carry-Over:** If the delivery following a no-ball is another no-ball or wide, the free hit carries over to the subsequent delivery until a legal delivery is bowled.
- **Dismissals Allowed on Free Hit:** Only `'runout'` and `'retired'` can result in an out on a Free Hit. Dismissals of type `'bowled'`, `'caught'`, `'lbw'`, `'stumped'`, or `'hitwicket'` are invalid on a free hit.

## 5. Runs Off Bat vs Extras
- Total runs for any delivery = `runsOffBat + (extra ? extra.runs : 0)`.
- **Batter stats:**
  - Batters are credited with `runsOffBat`.
  - Balls faced increments on legal deliveries and no-balls (batters face the delivery), but **not** on wides.
  - Boundaries (4s and 6s) increment `fours` and `sixes` and batter's runs.
- **Bowler stats:**
  - Runs conceded by bowler = `runsOffBat + (extra.type === 'wide' || extra.type === 'noball' ? extra.runs : 0)`.
  - Byes, leg-byes, and penalty runs are **not** charged to the bowler.
  - Wickets credited to bowler = `'bowled'`, `'caught'`, `'lbw'`, `'stumped'`, `'hitwicket'`.
  - Run outs and retired batters are **not** credited to the bowler.
  - A maiden over is defined as an over of 6 legal balls bowled by that bowler where 0 bowler-chargeable runs were conceded.

## 6. Strike Rotation and Crease Positions
- **Physical Runs:**
  - On non-boundary balls where runs were physically run (`runsOffBat > 0` or `extra.type === 'bye'` or `extra.type === 'legbye'`), an odd number of runs (1, 3, 5) swaps the striker and non-striker.
  - On boundaries (4 or 6), batters do not run, so strike does not swap.
- **End of Over:**
  - When an over completes (6 legal balls), ends swap.
  - If an odd run is scored on the 6th ball of an over, the batters swap for the run, and then swap again for the end of the over. The net result is that the batter who hit the odd run retains strike for the next over.
- **Dismissals:**
  - Following the MCC 2022 Laws of Cricket, for caught dismissals the incoming batter always takes strike at the striker's end regardless of crossing.
  - For bowled, lbw, stumped, and hit-wicket, the striker is out and incoming batter takes the striker's end.
  - For run outs: if the striker is run out, the incoming batter takes the striker end if even runs were completed, or non-striker end if odd runs were completed before the dismissal. If the non-striker is run out, incoming batter takes the non-striker end (or striker end if odd runs were completed).
  - If a wicket occurs on the last ball of an over, the end-of-over swap applies after the wicket is resolved.

## 7. Last Man Stands Rule
- **Standard (`lastManStands: false`):** An innings is all out when `playersPerSide - 1` wickets fall (e.g. 10 wickets in an 11-player side), because a lone batter has no partner.
- **Last Man Stands (`lastManStands: true`):** When `playersPerSide - 1` wickets fall, the remaining single batter can bat alone until dismissed. The innings is all out only when `playersPerSide` wickets fall. When batting alone, `currentNonStrikerId` is `null` and strike does not rotate.

## 8. Mid-Over Match Completion
- In the 2nd innings (or chase), as soon as `totalRuns >= target`, the innings immediately ends with reason `'target_chased'`. Subsequent events are not processed.

## 9. Super Over Support
- Supports extra tiebreaker innings (Innings 3 and 4) with 1 over per team (or custom super over length) and 2 wickets (3 players per side) or match config rules.


## 10. Dexie Schema & Immediate Persistence (Phase 2)
- **Decision:** Matches, teams, players, and ball events are stored in IndexedDB via Dexie. Every ball event is saved immediately with an incremental `sequence` number.
- **Rationale:** Prevents data loss if the browser tab is refreshed or the device battery dies mid-game. Zero running totals are stored in the database; reloading re-derives everything from the saved `BallEvent` array.

## 11. Voice Scoring Safety
- **Decision:** Voice commands for runs (`0` to `6`) commit immediately with an Undo button in the toast. Critical commands (`wicket` and `undo`) require a 3-second countdown toast with a tap-to-cancel action before committing.
- **Rationale:** Ambient noise, player chatter, or misrecognition on the field must not accidentally record a wicket or delete a ball without user awareness and chance to cancel.

## 12. PWA & Offline-First Strategy
- **Decision:** `vite-plugin-pwa` with Workbox precaching caches all scripts, stylesheets, fonts, and assets on first load. Dexie persists all matches locally.
- **Rationale:** Ground locations often have zero cell coverage or weak mobile data. PitchLog functions with 100% fidelity with airplane mode active.


## 13. Phase 3 Architecture: Local-First Cloud Sync, Realtime Broadcast & RLS
- **Local-First Outbox Pattern:**
  - All writes (matches, teams, players, balls, undos) write immediately and atomically to Dexie IndexedDB and enqueue an outbox operation.
  - The UI never waits for network or Supabase. A background `SyncWorker` flushes batches (up to 50 balls at a time) with exponential backoff and jitter.
- **Idempotent UUIDs & Tombstones:**
  - Every ball event has a client-generated UUID `id`. Re-uploading an existing event is a no-op idempotency upsert.
  - Undos write a `tombstone_ball` outbox record setting `deleted_at = now()`. Soft-deleted balls are filtered by both the client engine and remote viewers.
- **Realtime Broadcast Strategy vs Postgres Changes:**
  - Scorer clients broadcast sub-second updates (`ball_added`, `ball_undone`) on a per-token channel: `live-match:${shareToken}`.
  - **Rationale:** Supabase table-level `postgres_changes` listens across all rows or requires row filters that can leak existence of other matches or require complex channel authentication. Per-token ephemeral broadcast channels ensure only holders of the unguessable 128-bit share token receive live ball updates, while database writes provide durable history for reloads.
- **Anonymous Authentication & Zero-Data-Loss Upgrade:**
  - The app begins with silent anonymous Supabase authentication. Users can score matches immediately without typing credentials.
  - Upgrading to a full email/magic link account uses `supabase.auth.updateUser({ email })`, preserving the user's UUID and claiming all local matches without data loss.
- **Row Level Security & Public Live View:**
  - Full RLS is enforced across all tables (`matches`, `teams`, `players`, `ball_events`). Scorer mutations are restricted to `owner_id = auth.uid()`.
  - Public read access for live and completed matches is provided via a `security definer` RPC function `get_live_match(token text)` which validates that the match exists, has `is_live = true` or `status = 'completed'`, and matches the provided token.

## 14. Roadmap & Future Phase Decisions
Confirmed requirements for upcoming phases:
1. **Gully Rules Engine Expansion:** Configurable street rules such as "One-pitch one-hand catch is out", "Direct hit to car/window is out & minus runs", and custom boundary penalty rules.
2. **P2P / JSON Match Import & Export:** Offline file-based match exchange and backup to transfer scorecards and stats between scorers without mandatory cloud servers or accounts (JSON export is now available in Settings).

## 15. Phase 4 Architecture: Derived Stats, Charts, MVP & Player Profiles
- **Additive Engine Field for Shot Zones:**
  - Added optional `shot?: { zone: ShotZone }` to `BallEvent` where `ShotZone = 1|2|3|4|5|6|7|8` (8 equal 45° sectors radiating from the stumps).
  - Left-handed batters have zones mirrored horizontally (e.g. Zone 1 Fine Leg becomes Zone 5 Third Man).
- **Pure Derived Functions:**
  - Batting, bowling, fielding, partnerships, match analytics (wagon wheel, worm chart, Manhattan, run rate comparison), and MVP points are pure functions of `(events[], config)`. No stats are stored as a source of truth.
- **Incremental Per-Match Memoization:**
  - `MatchAggregateCache` caches per-match aggregates keyed by `matchId + eventCount`. Multi-match career stats aggregate pre-computed match records, benchmarked at <15ms for 200 matches.

## 16. Phase 5 Architecture: Tournaments, Base-6 NRR, Knockout Progression & Single-Writer Model
- **Pure Derived Standings & Exact Base-6 NRR:**
  - Points, NRR, and group/league standings are derived on-the-fly from tournament fixtures and match events.
  - Overs are evaluated using exact base-6 legal deliveries (`balls / 6.0`), eliminating floating-point errors.
  - All-out rule penalty charges the full quota (e.g. 120 balls for 20 overs) to prevent artificial run-rate inflation. Successful chases count only actual balls faced. Super Overs and abandoned matches are strictly excluded.
- **Knockout Progression & Downstream Bracket Guards:**
  - Single-elimination trees advance winners (and optional 3rd place playoff losers) automatically into downstream bracket slots.
  - If a downstream match is already live or completed, modifying an upstream match's result is strictly blocked to maintain tournament integrity.
- **Single-Writer Organiser Model:**
  - The organizer's account owns the tournament and all associated fixtures. Multiple simultaneous scorers across separate organiser accounts are not supported in this phase.
  - Viewers access read-only standings, brackets, and live links via the `get_public_tournament(token)` SECURITY DEFINER RPC with unguessable 128-bit tokens.
- **Offline-First Dexie Persistence & Outbox Sync:**
  - `tournaments`, `tournamentTeams`, and `fixtures` are stored in IndexedDB and synchronized idempotently via Supabase outbox operations (`upsert_tournament`, `upsert_tournament_team`, `upsert_fixture`).
  - Added optional `shot?: { zone: 1|2|3|4|5|6|7|8 }` to `BallEvent` in `src/engine/types.ts`.
  - All existing engine code, match derivations, and test suites run 100% backward compatible without modification.
  - **Sync Payload Storage:** Shot data travels inside the existing `ball_events.payload` jsonb column in Supabase with zero migration required.
- **Pure Functional Stats Layer (`src/stats/`):**
  - All stats are pure functions: `(events[], match snapshots) -> stats`.
  - Zero imports from React, DOM, or Dexie in `src/stats/`.
  - Stats are ephemeral cache and derived on the fly; no stat is ever stored as truth.
  - Invalidation is governed by `STATS_CACHE_VERSION` in `src/stats/memoCache.ts`.
- **Identity & Merge Strategy:**
  - Stats aggregate strictly by `playerId`, never by player name.
  - Duplicate players can be merged via `repository.mergePlayers(sourceId, targetId)` which atomically remaps IDs across all local `ball_events`, team rosters, marks the source soft-deleted, enqueues idempotent updates to the sync outbox, and provides a 10-second undo window.
- **Transparent MVP System:**
  - Defined in a single source of truth constants object `MVP_WEIGHTS` in `src/stats/mvp.ts`.
  - Deterministic tie-breaker: MVP Points -> Batting Runs -> Bowling Wickets -> Bowling Economy -> Player ID.
- **Zero-Dependency SVG Visualizations:**
  - Wagon wheel (with left-hand batter horizontal mirroring), Manhattan (with wicket dots), Worm (with chase target line), and Run Rate comparisons are rendered via pure SVG for zero bundle bloat and instant rendering in sunlight-readable high-contrast dark theme.
- **Milestones & Badges:**
  - 10 milestone badges (Debut, Maiden Fifty, Century Club, Fifer, Hat-Trick, 100 Career Runs, 100 Career Wickets, Golden Duck, Super Striker, Mr. Miser) are derived purely by inspecting career milestones.
  - Unlocked milestones are toasted at match end via `MatchEndModal`.

---

## 17. Architecture Decisions: Custom Gully Rules, Player Profiles & Team Identity (D023–D035)

### D023: Editable Player Profiles
- **Context:** Scorers frequently misspell player names during fast match setup, or players change nicknames, batting handedness, or bowling styles over time.
- **Decision:** Users can edit player names, batting style, bowling style, and profile avatars at any time in the library.
- **Rationale:** Historical match scorecards snapshot player names at match creation time, so updating a player's library profile updates future matches while preserving the fidelity of past matches.

### D024: Stable PlayerId Independent of Display Name
- **Context:** If player names are used as primary or foreign keys, renaming "Ravi" to "Ravindra" would corrupt historical records, career aggregates, and outbox sync.
- **Decision:** Every player entity is identified by an immutable RFC4122 v4 UUID (`PlayerId`). Names are strictly presentation attributes.
- **Rationale:** Guarantees relational and event integrity across matches, tournaments, and multi-team rosters.

### D025: Configurable Gully Cricket Rules Engine
- **Context:** Gully cricket rules vary from street to street and society to society. Hardcoding exceptions inside the core scoring reducer creates brittle, untestable code.
- **Decision:** Create a dedicated, modular Match Rules engine (`src/rules/`) with customizable rule definitions and presets (`standard`, `gully`, `tennis_ball`, `society`, `custom`). Matches store an immutable snapshot of their active rules configuration.
- **Rationale:** Preserves the purity of the core scoring reducer while offering infinite rule customizability.

### D026: One Tip One Hand Support
- **Context:** A universal street cricket rule where a batter can be caught out with one hand after one bounce.
- **Decision:** Model "One Tip One Hand" as a configurable dismissal with customizable max bounces (default 1), strict single-hand requirement, wall-touch constraints, and optional bowler credit.
- **Rationale:** Accurately reflects local gameplay without distorting standard caught dismissal statistics.

### D027: Mankad / Run-Out Support
- **Context:** Running out the non-striker before delivery release is an official law (MCC Law 38) but often disputed or disabled in informal street games.
- **Decision:** Model Mankad under the standard `runout` dismissal type with a distinct subtype: `{ type: 'runout', subtype: 'mankad', playerOutId, bowlerId }`. Configurable per match.
- **Rationale:** Avoids inventing non-standard top-level dismissal categories while accurately recording the dismissal and not charging a wicket to the bowler.

### D028: Hit-Wicket Support
- **Context:** Batters accidentally dislodging their own stumps during a shot or run.
- **Decision:** Support `hitwicket` dismissals with validation that hit-wicket is invalid and ignored on a Free Hit delivery. Credited to the bowler.
- **Rationale:** Conforms strictly to official laws of cricket and grassroots scoring reality.

### D029: Configurable Wall Rules
- **Context:** Many street grounds have compound walls, parked vehicles, or garages functioning as boundaries.
- **Decision:** Introduce a dedicated `WallRulesConfig` supporting direct hits (4 runs, 6 runs, dead ball, custom runs, or out) and ground taps (1 run, dead ball, boundary four, or live ball), independent of open-ground boundaries.
- **Rationale:** Solves the primary complaint against standard cricket scorers which cannot score street wall outcomes.

### D030: Dead Ball and Reball are Distinct Concepts
- **Context:** Scorers frequently confuse a dead ball (play halted due to external obstruction) with an undo (scoring error) or a reball (mandatory replay of a delivery attempt).
- **Decision:** Architecturally separate `DeliveryAttempt`, `BallEvent`, `DeadBallEvent`, and `ReballOperation`. A reball voids scoring outcomes of the superseded attempt while preserving it in the audit log, without advancing the legal delivery counter.
- **Rationale:** Prevents duplicate runs, protects legal ball counts, and guarantees complete audit traceability.

### D031: Pace Call Requires Clarification
- **Context:** "Pace Call" is a common local rule in Indian street cricket, but its exact trigger and penalty differ significantly across regions.
- **Decision:** Establish an architectural placeholder `PaceCallRule` in the domain schema and explicitly mark it with status `PENDING_SPECIFICATION`. Do not implement speculative behaviors until clarified by the project lead.
- **Rationale:** Prevents building assumptions into the engine that would later require breaking schema migrations.

### D032: Animal Mascot Catalogue
- **Context:** Scorers and organizers want visual identity for teams without finding, resizing, and uploading custom image files on mobile devices.
- **Decision:** Provide a built-in vector catalogue of 14 high-contrast animal mascots (Lion, Tiger, Eagle, Panther, Wolf, Falcon, Cobra, Dragon, Bull, Rhino, Shark, Cheetah, Gorilla, Phoenix).
- **Rationale:** Zero network dependency, instant offline loading, and crisp SVG rendering on dark-mode scorecards.

### D033: IPL Identity Catalogue
- **Context:** Gully and society tournaments almost universally name teams after IPL franchises (e.g., "Gully CSK", "Society RCB").
- **Decision:** Provide an extensible data-driven catalogue of all 10 IPL franchises with team names, primary/secondary colors, and generic vector insignias.
- **Rationale:** Maximizes player delight and familiarity while respecting intellectual property by avoiding unlicensed copyrighted logos.

### D034: International Team Identity Catalogue
- **Context:** Weekend tournaments frequently mimic World Cup or international formats.
- **Decision:** Provide a data-driven international country catalogue with national team names, standard colors, and flag badges, extensible beyond top-tier teams.
- **Rationale:** Enables instant setup of "India vs Pakistan" or "Ashes" style local tournaments.

### D035: Custom Team Identity
- **Context:** Established local clubs and corporate teams possess their own proprietary logos and color palettes.
- **Decision:** Support custom logo uploads, custom hex color palettes, custom team names, and dynamic 2-3 letter initials badge generation when no avatar is selected.
- **Rationale:** Offers unconstrained flexibility for professional clubs while maintaining aesthetic consistency.

