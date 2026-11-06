# PitchLog Cricket Scoring Engine Specification (SPEC.md)

## 1. Overview
PitchLog is an offline-capable Cricket Scorer Progressive Web App built with an Event Sourced architecture. All match statistics, scores, wickets, overs, and crease dynamics are derived via pure TypeScript functions from an immutable list of `BallEvent` objects.

---

## 2. Domain Data Models (`src/engine/types.ts`)

### Match Configuration (`MatchConfig`)
- `oversPerInnings: number` — Total overs allocated per innings (e.g. 20, 10, 5, 1).
- `playersPerSide: number` — Team size (e.g. 11, 8, 6, 2).
- `wideReBowl: boolean` — If `true`, a wide must be re-bowled and does not count towards the over's 6 legal deliveries. If `false` (street cricket rule), wide counts as a legal delivery.
- `noBallFreeHit: boolean` — If `true`, a no-ball grants a Free Hit on the subsequent legal delivery.
- `lastManStands: boolean` — If `true`, when 1 wicket remains before all-out (`playersPerSide - 1`), the remaining batter bats alone until dismissed (`playersPerSide` wickets). If `false`, innings ends all-out at `playersPerSide - 1` wickets.
- `superOverOvers?: number` — Optional overs per super over innings (defaults to 1).

### Ball Event (`BallEvent`)
- `id: string` — Unique ball identifier.
- `inningsNo: number` — Identifies the innings (1, 2, or 3 & 4 for super over).
- `batterId: string` — Active striker when the ball was delivered.
- `nonStrikerId: string` — Active non-striker when the ball was delivered.
- `bowlerId: string` — Active bowler delivering the ball.
- `runsOffBat: number` — Runs scored by the striker with the bat.
- `extra: { type: 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty', runs: number } | null` — Extras associated with this delivery.
- `wicket: { type: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'retired', playerOutId: string, fielderId?: string } | null` — Dismissal event.
- `isBoundary4: boolean` — `true` if a boundary 4 was scored.
- `isBoundary6: boolean` — `true` if a boundary 6 was scored.
- `timestamp: number` — Epoch millisecond timestamp of delivery.

---

## 3. Implemented Scoring Rules

### 3.1. Delivery Legality (`isLegalDelivery`)
- **Standard delivery:** Legal (`true`).
- **No-ball (`'noball'`):** Always illegal (`false`), must be re-bowled. Does not advance `legalBalls`.
- **Wide (`'wide'`):**
  - If `config.wideReBowl === true`: Illegal (`false`).
  - If `config.wideReBowl === false`: Legal (`true`).
- **Byes & Leg-byes (`'bye'`, `'legbye'`):** Legal (`true`), counts towards the 6 balls of the over.
- **Penalty (`'penalty'`):** Legal delivery (`true`).

### 3.2. Overs & Balls Representation (`ballsToOvers`, `oversToBalls`)
- Overs are formatted in standard cricket notation: `${Math.floor(balls / 6)}.${balls % 6}`.
- Examples: 0 balls -> `"0.0"`, 5 balls -> `"0.5"`, 6 balls -> `"1.0"`, 8 balls -> `"1.2"`.

### 3.3. Run Accounting
- **Total ball runs:** `event.runsOffBat + (event.extra ? event.extra.runs : 0)`.
- **Extras Breakdown:**
  - `wides`: Total wide runs.
  - `noBalls`: Total no-ball runs.
  - `byes`: Total bye runs.
  - `legByes`: Total leg-bye runs.
  - `penalties`: Total penalty runs.
  - `total`: Sum of all extras.

### 3.4. Batter Statistics (`BatterStats`)
- `runs`: Accumulated `runsOffBat`.
- `ballsFaced`: Increments on all legal deliveries and no-balls; does **not** increment on wides.
- `fours`: Count of `isBoundary4 === true`.
- `sixes`: Count of `isBoundary6 === true`.
- `strikeRate`: `(runs / ballsFaced) * 100` (or `0` if 0 balls faced), rounded to 2 decimal places.
- `isOut`: `true` if dismissed.
- `dismissal`: Breakdown of dismissal type, bowler, and fielder.

### 3.5. Bowler Statistics (`BowlerStats`)
- `ballsBowled`: Count of legal deliveries bowled.
- `overs`: Formatted string via `ballsToOvers(ballsBowled)`.
- `runsConceded`: Charged to bowler: `runsOffBat` + `wides` + `noBalls`.
  - **Excluded from bowler:** `byes`, `legbyes`, and `penalties` are fielding/match extras.
- `wickets`: Credited to bowler: `'bowled'`, `'caught'`, `'lbw'`, `'stumped'`, `'hitwicket'`.
  - **Excluded from bowler:** `'runout'` and `'retired'` are not bowler wickets.
- `economy`: `runsConceded / (ballsBowled / 6)` (or `0` if 0 balls bowled), rounded to 2 decimal places.
- `maidens`: An over of 6 legal balls bowled by that bowler where 0 bowler-chargeable runs were conceded across all deliveries in that over.

### 3.6. Free Hit Mechanics
- When `config.noBallFreeHit === true`:
  - A no-ball marks `isFreeHit = true` for the subsequent delivery.
  - If the subsequent delivery is illegal (wide or no-ball), the Free Hit carries over until a legal delivery is bowled.
  - On a Free Hit delivery, dismissals of type `'bowled'`, `'caught'`, `'lbw'`, `'stumped'`, and `'hitwicket'` are **invalid** and ignored.
  - Dismissals of type `'runout'` and `'retired'` remain **valid** on a Free Hit.

### 3.7. Strike Rotation & Crease Positioning
- **Runs Run:**
  - On non-boundary deliveries, odd completed runs (1, 3, 5) swap striker and non-striker.
  - Boundaries (4, 6) do not swap ends because batters do not physically run.
  - Byes / Leg-byes with odd runs swap ends.
- **End of Over:**
  - Upon completion of 6 legal balls (`legalBalls % 6 === 0`), ends swap.
  - **Odd run on 6th ball:** Batters swap for the run, then swap again for the end of the over. The striker who hit the odd run retains strike to face ball 1 of the new over.
  - **Even run or boundary on 6th ball:** Ends swap once for the over. The non-striker faces ball 1 of the new over.
- **Wicket on 6th ball:**
  - If striker is dismissed on ball 6, surviving non-striker moves to the striker end to face the new over; incoming batter enters at the non-striker end.
  - If non-striker is dismissed on ball 6, surviving striker moves to non-striker end; incoming batter faces the new over at striker end.
- **Run-out with runs completed:**
  - If odd runs were completed before the run-out, batters crossed ends before the dismissal.

### 3.8. Last Man Stands (`lastManStands`)
- **Standard (`lastManStands: false`):**
  - Innings ends `'all_out'` when `playersPerSide - 1` wickets fall (e.g. 10 wickets in an 11-player side).
- **LMS Enabled (`lastManStands: true`):**
  - At `playersPerSide - 1` wickets, the innings does **not** end. The lone surviving batter continues batting alone (`currentNonStrikerId = null`).
  - The innings ends `'all_out'` only when the lone batter is dismissed (`playersPerSide` wickets).

### 3.9. Chase Calculator (`calculateChase`)
- `runsNeeded`: `Math.max(0, target - currentRuns)`.
- `ballsRemaining`: `Math.max(0, (oversPerInnings * 6) - legalBalls)`.
- `requiredRunRate`: `(runsNeeded / ballsRemaining) * 6` (or `Infinity` if balls exhausted with runs needed, `0` if target reached).
- `formattedText`: e.g. `"4 off 11"`, `"Target reached"`, or `"10 needed, overs completed"`.

### 3.10. Innings Completion
- An innings terminates when:
  1. `target !== null && totalRuns >= target` -> `'target_chased'` (evaluated mid-over; subsequent events are ignored).
  2. `wickets >= maxWickets` -> `'all_out'`.
  3. `legalBalls >= oversPerInnings * 6` -> `'overs_complete'`.

### 3.11. Event Sourcing and Innings Scoped Undo (`undoLast`)
- All match state is derived from immutable event logs.
- `undoLast(events, inningsNo)` searches backwards and removes only the most recent event where `event.inningsNo === inningsNo`. Events from other innings are never modified or removed.

### 3.12. Super Over (`superOver.ts`)
- Support for tiebreaker innings (Innings 3 & 4) via `createSuperOverConfig` and `deriveSuperOver`.
- Configured for 1 over (6 balls) and 3 players per side (2 wickets = all out).

---

## 4. Phase 3 Architecture: Accounts, Cloud Sync, Live Link, Teams Library

### 4.1. Local-First Outbox Pattern
- Local writes to Dexie IndexedDB are primary and non-blocking. Every state mutation (match creation, ball recorded, ball undone, team saved) writes to Dexie first and enqueues an `OutboxRecord`.
- Background `SyncWorker` flushes outbox records in batches (up to 50 items) preserving dependent ordering (team/player/match created before ball events).
- Failures trigger exponential backoff with jitter (`calculateBackoff`).
- If offline, outbox items queue locally without interruption to scoring.

### 4.2. Public Live Match Link (`/live/:token`)
- Scorers can toggle "Go Live" at any time, generating a 128-bit unguessable share token.
- Share modal provides instant QR code, link copying, and direct WhatsApp match invitation text.
- Sub-second updates broadcast on an ephemeral channel (`live-match:${token}`) using Supabase Realtime Broadcast.
- Viewers at `/live/:token` connect read-only via `get_live_match(token)` without an account or Dexie; viewer receives events and derives complete match score, striker/bowler stats, and commentary using the pure scoring engine.

### 4.3. Teams & Players Library
- Users can manage reusable teams and squads from the Teams Library (`TeamsListScreen`, `TeamDetailScreen`, `PlayersListScreen`).
- In Match Setup Wizard, scorers can pick saved teams and squads with one tap or opt in to save newly entered teams and players to their library.
- Soft-deletes (`deleted_at`) ensure historical scorecards retain team/player names even if deleted from the active library.

### 4.4. Accounts & Data Portability
- Seamless onboarding with Supabase anonymous sign-in; users can score immediately without passwords.
- Users can upgrade to a permanent email account anytime without losing local or previously synced data.
- Settings screen provides sync diagnostics, outbox count, forced sync trigger, "Back up all local matches" claiming action, and one-click JSON export of all database tables.
