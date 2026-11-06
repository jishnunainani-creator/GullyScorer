# Gully Cricket Scorer ("PitchLog") — Product Requirements Document (PRD)

**Document Version:** 2.0.0  
**Status:** Approved for Architectural Review  
**Target Platform:** Mobile-First Progressive Web App (PWA) — iOS, Android, Desktop Web  

---

## 1. Executive Summary & Vision

Cricket in India is not confined to manicured stadium pitches. Hundreds of millions of matches happen weekly on streets, gullies, housing society driveways, concrete terraces, open maidans, and local turf grounds. These grassroots games—spanning tennis-ball cricket, rubber-ball gully matches, and amateur club tournaments—feature hyper-local ground rules, rapid turnaround, and deep community pride.

**PitchLog** is an offline-first, mobile-optimized cricket scoring PWA designed specifically for the diverse, dynamic reality of gully and grassroots cricket across India. It combines a rigorous, mathematically exact event-sourced scoring engine with an unprecedented degree of rule customisation, player identity management, and team branding.

---

## 2. Target Audience & Personas

| Persona | Environment | Key Needs | Pain Points with Existing Scorer Apps |
| :--- | :--- | :--- | :--- |
| **Gully & Street Scorers** | Narrow residential lanes, terrace rooftops, dead-end streets | One Tip One Hand, Wall boundaries, Mankad, 4 to 8 ball overs, Last Man Standing | Mainstream apps strictly enforce ICC laws; crash or forbid local rules like "direct hit to wall is 4, tap is 1". |
| **Housing Society Tournament Organizers** | Society compounds, concrete basements, park pathways | Fast team creation, recognizable mascots & IPL avatars, clear standings, net run rate (NRR) | Difficult team onboarding, forced phone number/login walls before scoring, slow connectivity in basements. |
| **Club & Turf League Organizers** | Synthetic box turfs, local maidans, leather & heavy tennis ball | Player career statistics, captain/vice-captain tracking, multi-team player continuity, match exports | Clunky player duplication across teams, locked paywalls for leaderboards, mandatory internet connection. |

---

## 3. Core Product Pillars

1. **Local-First & Resilient Offline Fidelity:** Works with zero cellular or Wi-Fi connectivity. Scoring, rule validation, and statistics derivation execute entirely on-device via IndexedDB. Cloud sync is asynchronous and never blocks scoring.
2. **Pure Event-Sourcing:** Every action (delivery attempt, legal ball, dead ball, reball, wicket, retirement) is an immutable event. State is always derived, making undos, edits, and audit logs mathematically robust.
3. **Hyper-Configurable Rules Engine:** Ground rules are first-class citizens. Organizers can configure One Tip One Hand, Wall boundaries, Pace Calls, Mankad, and custom dismissals through presets or fine-grained controls.
4. **Deep Team & Player Identity:** Out-of-the-box avatar libraries (Animal mascots, IPL franchises, International flags, Custom color palettes) without forcing image uploads, paired with stable player profiles across teams.
5. **Multilingual Inclusivity:** Full localized support for **English**, **Hindi (हिंदी)**, and **Gujarati (ગુજરાતી)**.

---

## 4. Feature Requirements

### 4.1. Player Management

Users must be able to manage players as persistent, cross-match entities with full lifecycle control:

1. **Player Profile Attributes:**
   - `id`: Globally unique, immutable UUID (`PlayerId`).
   - `displayName`: Editable string (e.g., "Rohit Sharma", "Bunty").
   - `battingStyle`: Enum (`right_hand_bat`, `left_hand_bat`).
   - `bowlingStyle`: Enum (`right_arm_fast`, `right_arm_medium`, `right_arm_spin_off`, `right_arm_spin_leg`, `left_arm_fast`, `left_arm_medium`, `left_arm_spin_orthodox`, `left_arm_spin_chinaman`, `none`).
   - `avatar`: Profile avatar configuration (custom photo upload or initials fallback).
   - `createdAt`, `updatedAt`, `deletedAt`: Audit timestamps.
2. **Identity & Name Decoupling:**
   - Player identity is strictly anchored to `PlayerId`. Renaming a player updates future displays while leaving historical statistics, match snapshots, and ball events fully intact.
   - Matches snapshot player names at match creation time to preserve historical scorecards accurately even if a player's nickname or display name changes later.
3. **Team Membership & Roles:**
   - Players can be added to or removed from multiple team rosters. A single real-world player maintains one `PlayerId` across different society, turf, and weekend teams.
   - Captain (`isCaptain`) and Vice-Captain (`isViceCaptain`) designations per team or per match.
4. **Mid-Match Player Replacement:**
   - Permitted in friendly/gully configurations (e.g. player had to leave early for work/home).
   - Substituted player replaces the roster slot while preserving balls bowled/faced by the outgoing player.
5. **Career Statistics & Performance History:**
   - Purely derived career aggregates: Matches, innings, runs, balls faced, strike rate, batting average, 30s/50s/100s, wickets, bowling average, economy, best bowling in innings (BBI), 3-fers/5-fers, catches, run-outs, MVP points.
   - Historical match log displaying performance in each previous match.

---

### 4.2. Custom Gully Cricket Rules Engine

The scoring system must decouple rule evaluation from the scoring reducer through a dedicated, modular **Match Rules Engine**.

#### A. One Tip One Hand ("Ek Tappa Ek Haath")
- **Description:** A fielder can dismiss a batter by catching the ball with a single hand after it has bounced exactly once (or up to configured bounces).
- **Configurations:**
  - `enabled: boolean` (Default: `false` for standard, `true` for Gully/Tennis presets).
  - `maxBounces: number` (Default: `1`).
  - `maxHandsAllowed: number` (Default: `1`, strict one-hand rule).
  - `canTouchWallBeforeCatch: boolean` (Default: `false`; whether catching after touching a boundary wall is out).
  - `bowlerCredited: boolean` (Default: `true`; credited to bowler as caught dismissal).
  - `dismissalLabel: string` (Default: `"One Tip One Hand"` / Hindi: `"एक टप्पा एक हाथ"`).

#### B. Mankad (Non-Striker Run Out Prior to Delivery)
- **Description:** Dismissal of the non-striker who leaves their ground before the bowler enters their delivery stride / releases the ball.
- **Configurations:**
  - `enabled: boolean` (Default: `true` in standard MCC 2022 laws and competitive presets; configurable).
  - `bowlerCredited: boolean` (Default: `false`; classified as run out, not bowler wicket).
  - `recordedBowler: string` (The active bowler at the time of the Mankad).
  - `dismissedPlayerId: string` (Must always be the active non-striker).
  - **Data Mapping:** Stored under standard `runout` dismissal type with subtype `mankad` (`{ type: 'runout', subtype: 'mankad', playerOutId, bowlerId }`).

#### C. Hit Wicket
- **Description:** Batter dislodges their own bails/stumps with their bat, clothing, or person in the act of playing a shot or setting off for a run.
- **Configurations:**
  - `enabled: boolean` (Default: `true`).
  - `bowlerCredited: boolean` (Default: `true`).
  - `freeHitExemption: boolean` (Default: `true`; hit wicket is not out on a Free Hit).

#### D. Wall & Restricted Boundary Rules
- **Description:** Gully cricket grounds frequently feature compound walls, parked vehicles, building balconies, or street corners that act as special physical boundaries.
- **Configurations:**
  - Independent from standard open-ground boundaries (4s and 6s).
  - Configurable outcomes:
    - Direct Wall Hit: `four_runs` | `six_runs` | `dead_ball` | `custom_runs (1..12)` | `out`.
    - Wall Tap / Deflection: `one_run` | `dead_ball` | `boundary_four` | `no_effect` (live ball, batters can run).
    - Window / Car Direct Hit: Optional local penalty rule (e.g. `out_and_minus_runs`, `out_and_pay_damage`).
  - Separate wall profiles can be saved and reused for specific grounds.

#### E. Pace Call (Local Street Rule)
- **Status:** **PENDING CLARIFICATION**.
- **Requirement:** Documented placeholder in the rules schema. Its exact gameplay trigger, penalty (e.g., dead ball vs no-ball vs warning), and speed estimation constraints are awaiting project lead specifications. The system must reserve `paceCallRule?: PaceCallConfig` with status `pending_specification`. No assumptions or hardcoded behaviors are permitted.

#### F. Dead Ball Management
- **Description:** Declarations where play is halted and ball is not in play.
- **Configurations:**
  - Manual dead ball trigger by scorer/umpire.
  - Reason code: `external_interference` (dog on pitch, passerby vehicle), `ball_lost`, `pitch_obstruction`, `umpire_call`, `player_injury`.
  - Configurable flags:
    - `isLegalBall: boolean` (Default: `false`).
    - `runsAwarded: number` (Default: `0`; configurable if penalty runs apply).
    - `mustReplay: boolean` (Default: `true`; delivery attempt is superseded by a fresh delivery).

#### G. Reball (Replayed Delivery Attempt)
- **Description:** Distinct mechanism from delivery undos. A delivery attempt was initiated or aborted (e.g. bowler pulled out, ball slipped, dead ball ordered), necessitating a fresh ball.
- **Audit & Accounting Rules:**
  - Must **never** duplicate runs.
  - Must **never** increment the legal delivery counter of the over.
  - Preserves the original delivery attempt in the historical audit ledger as a `DeliveryAttempt` with outcome `reball_demanded`.
  - Strictly distinguishes an aborted delivery attempt from a completed legal ball.

#### H. Additional Configurable Rule Options
- **LBW:** Enabled or Disabled (Default for Gully/Tennis is `false` — "Gully me LBW nahi hota").
- **Last Man Standing:** Single batter continues alone after $N-1$ wickets.
- **Balls Per Over:** Configurable from 4, 5, 6, 8, to 10 balls per over.
- **Wides:** Re-bowl required (`true`/`false`) and runs awarded (1, 2, or custom).
- **No-Balls:** Re-bowl required, runs awarded, and Free Hit granted (`true`/`false`).
- **Byes & Leg-Byes:** Allowed or Disabled (Common in gully: Byes allowed, Leg-byes disabled).
- **Overthrows:** Permitted or Dead Ball on overthrow.
- **Wickets Per Innings:** All-out threshold configurable independently of squad size.

---

### 4.3. Rule Presets

Users must be able to switch rule sets with one tap, customize parameters, and save presets:

| Preset Name | Target Format | Key Default Rule Configurations |
| :--- | :--- | :--- |
| **Standard Cricket** | Leather ball, club matches | ICC/MCC compliant: LBW enabled, Mankad enabled, 6-ball overs, No One Tip One Hand, Wall rules disabled, LMS disabled. |
| **Gully Cricket** | Residential lanes, street play | One Tip One Hand enabled (1 bounce, 1 hand), LBW disabled, Wall Hit = 4, Wall Tap = 1, LMS enabled, Wide re-bowl enabled, Leg-byes disabled. |
| **Tennis Ball Cricket** | Open maidans, box turfs | 6-ball overs, Free hits on front-foot no-ball, LBW disabled, Byes enabled, Leg-byes enabled, Wides re-bowled, LMS disabled. |
| **Society Cricket** | Apartment complexes, driveways | Direct wall/car hit = Out, Ground wall hit = 2 runs, One Tip One Hand enabled, 5-ball overs, LMS enabled, Low overs (4-6 ov). |
| **Custom Rules** | User-configured | Full unrestricted parameter editing; savable as named user presets. |

**Rule Versioning & Snapshots:** Match records store a complete immutable snapshot of the active `MatchRules` at the time the toss is confirmed. Modifying global presets later never alters the rules of completed historical matches.

---

### 4.4. Team Identity & Avatar Library

Teams must possess distinct, memorable branding without requiring scorers to source and upload custom image files on the field:

#### A. Animal Mascots (Generic Vector Avatars)
14 standardized sports mascots rendered as high-contrast SVG badges:
- **Lion** (Courage/Strength)
- **Tiger** (Agility/Power)
- **Eagle** (Vision/Speed)
- **Panther** (Ferocity)
- **Wolf** (Teamwork/Pack)
- **Falcon** (Precision)
- **Cobra** (Speed/Deadliness)
- **Dragon** (Dominance)
- **Bull** (Force)
- **Rhino** (Defense)
- **Shark** (Attacking)
- **Cheetah** (Velocity)
- **Gorilla** (Raw Power)
- **Phoenix** (Resilience/Comeback)

#### B. IPL Franchise Identities
Data-driven catalogue mapping to the 10 premier Indian Premier League franchises:
- Chennai Super Kings (Yellow / Blue)
- Mumbai Indians (Blue / Gold)
- Royal Challengers Bengaluru (Red / Black / Gold)
- Kolkata Knight Riders (Purple / Gold)
- Sunrisers Hyderabad (Orange / Black)
- Rajasthan Royals (Pink / Blue)
- Delhi Capitals (Blue / Red)
- Punjab Kings (Red / Silver)
- Gujarat Titans (Dark Blue / Gold)
- Lucknow Super Giants (Navy / Cyan / Orange)
*Note on Licensing:* Uses official colors, franchise abbreviations, and original custom generic vector icons. Extensible JSON catalogue allowing easy updates when franchise names or branding evolve.

#### C. International Cricket Teams
Extensible country catalogue with national team names, standard primary/secondary colors, and national flag representations:
- India, Australia, England, South Africa, New Zealand, Pakistan, West Indies, Sri Lanka, Bangladesh, Afghanistan, Netherlands, Ireland, Scotland, Nepal, USA, UAE, etc.

#### D. Custom Team Identity
- Custom logo upload (persisted locally with optional cloud sync).
- Custom primary and secondary hex colors.
- Custom team name and 2-to-3 letter initials badge fallback.

---

## 5. Non-Functional Requirements

1. **Performance:** Event append and state derivation must complete in $< 16\text{ ms}$ (60 fps) on low-end Android hardware.
2. **Offline Durability:** 100% of player profiles, rules presets, team avatars, and match events must persist immediately to IndexedDB before UI updates.
3. **Data Integrity:** No event is ever deleted or mutated during normal gameplay; corrections append compensating events or tombstone flags.
4. **Internationalization (i18n):** All rule terms, dismissals, stats, and dialogs must support English, Hindi, and Gujarati with zero missing translation fallbacks.
