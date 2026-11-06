# PitchLog System Architecture & Technical Design

**Document Version:** 2.0.0  
**Status:** Approved for Implementation Planning  
**Scope:** Event-Sourced Engine, Rules Engine, Player Identity, Team Branding & Persistence  

---

## 1. System Overview & Clean Layered Architecture

PitchLog adheres to a strict hexagonal, layered architecture where the core domain logic remains 100% pure, decoupled from UI frameworks, storage engines, and cloud services.

```mermaid
flowchart TD
    subgraph UI_Layer["Layer 6: Presentation (React + Tailwind)"]
        UI_Scorer["Live Scoring Screen"]
        UI_Setup["Match Setup & Rules Wizard"]
        UI_Teams["Team & Avatar Selector"]
        UI_Stats["Analytics, Charts & Leaderboards"]
    end

    subgraph Sync_Layer["Layer 5: Network & Synchronization"]
        SyncWorker["Outbox Sync Worker"]
        Broadcast["Realtime Broadcast Channels"]
        SupabaseClient["Supabase API (RLS Enforced)"]
    end

    subgraph Storage_Layer["Layer 4: Local Persistence (Dexie / IndexedDB)"]
        DexieDB["PitchLogDB (v4)"]
        OutboxTable["Outbox Queue"]
        SnapshotTable["Match & Rules Snapshots"]
    end

    subgraph Stats_Layer["Layer 3: Pure Derived Statistics"]
        BattingStats["Batting & Bowling Aggregators"]
        TournamentStandings["Base-6 NRR & Standings Engine"]
        MVPEngine["MVP & Milestone Derivation"]
    end

    subgraph Rules_Layer["Layer 2: Match Rules Engine"]
        RuleCatalogue["Rule Catalogue (One Tip, Wall, Mankad, LMS)"]
        RulePresets["Rule Presets (Gully, Tennis, Society, Standard)"]
        RuleValidator["Delivery & Dismissal Validator"]
    end

    subgraph Core_Engine["Layer 1: Pure Event-Sourced Scoring Engine"]
        EventLedger["Immutable Match Events Ledger"]
        DeliveryReducer["Innings & Crease Reducer"]
        StrikeResolver["Strike & Over Rotation Engine"]
    end

    UI_Scorer --> Core_Engine
    UI_Scorer --> Rules_Layer
    UI_Scorer --> Storage_Layer
    UI_Stats --> Stats_Layer
    Stats_Layer --> Core_Engine
    Rules_Layer --> Core_Engine
    Storage_Layer --> Core_Engine
    Storage_Layer --> Rules_Layer
    Sync_Layer --> Storage_Layer
    Sync_Layer --> SupabaseClient
```

---

## 2. Event Sourcing & Delivery Lifecycle Architecture

In standard scoring apps, match score, wickets, and overs are stored as mutable integers (`score = score + 4`). This architecture fails catastrophically in grassroots cricket where umpires reverse decisions, balls are declared dead mid-delivery, overthrows occur, or gully rules require reballs.

In PitchLog, **every action is an immutable event**. State is a pure mathematical projection:
$$\text{State}_t = f(\text{Rules}, [\text{Event}_1, \text{Event}_2, \dots, \text{Event}_t])$$

### 2.1. Explicit Event Taxonomy

To eliminate ambiguity and prevent accidental double-counting, the domain model strictly separates delivery attempts, legal balls, dead balls, reballs, and player status changes:

```mermaid
classDiagram
    class MatchEvent {
        <<interface>>
        +string id
        +number inningsNo
        +number timestamp
        +string type
    }

    class DeliveryAttempt {
        +string bowlerId
        +string strikerId
        +string nonStrikerId
        +string attemptOutcome
        +string? abortReason
    }

    class BallEvent {
        +string bowlerId
        +string batterId
        +string nonStrikerId
        +number runsOffBat
        +ExtraInfo? extra
        +WicketInfo? wicket
        +WallContactInfo? wallContact
        +boolean isBoundary4
        +boolean isBoundary6
        +ShotZone? shot
    }

    class DeadBallEvent {
        +string reason
        +boolean countsAsLegalBall
        +number penaltyRunsAwarded
        +boolean mustReplayDelivery
    }

    class ReballOperation {
        +string supersededEventId
        +string reason
        +boolean runsVoided
    }

    class BatterRetirementEvent {
        +string playerId
        +string retirementType
        +string incomingBatterId
    }

    MatchEvent <|-- DeliveryAttempt
    MatchEvent <|-- BallEvent
    MatchEvent <|-- DeadBallEvent
    MatchEvent <|-- ReballOperation
    MatchEvent <|-- BatterRetirementEvent
```

#### Detailed Taxonomy Definitions:
1. **`DeliveryAttempt`:** Captures an initiated delivery before completion (e.g., bowler pulls out at the crease, ball slips from hand and rolls dead, non-striker is warned).
2. **`BallEvent` (Legal / Completed Delivery):** Represents a completed delivery bowled to the batter. Encapsulates runs off bat, extras (wide, no-ball, bye, leg-bye, penalty), wicket details, wall contact outcomes, and optional wagon-wheel shot vectors.
3. **`DeadBallEvent`:** Represents an explicit halt of play (external animal/vehicle invasion, ball lost in bushes, spectator interference). Explicitly declares whether legal ball count increments, whether penalty runs apply, and whether the delivery must be re-bowled.
4. **`ReballOperation`:** Represents an operational replay mandate. It references a `supersededEventId`, marks its outcomes as voided for scoring while retaining the attempt in the audit log, and guarantees the legal delivery counter does not advance.
5. **`WicketEvent` (Embedded or Standalone):** Encapsulates dismissal details, fielder involvement, bowler credit, and crease position resolutions.
6. **`BatterRetirementEvent`:** Distinguishes voluntary retirements (`retired_hurt` vs `retired_out`). Does not charge a dismissal to the bowler.

---

## 3. Dedicated Match Rules Engine Architecture

Rather than embedding conditional `if/else` checks throughout the scoring reducer, PitchLog introduces a standalone **Match Rules Subsystem** (`src/rules/`).

### 3.1. Rules Evaluation Pipeline

```mermaid
sequenceDiagram
    participant User as Scorer UI
    participant Coordinator as Scoring Coordinator
    participant RulesEngine as Match Rules Engine
    participant Reducer as Pure Scoring Reducer
    participant Storage as IndexedDB (Dexie)

    User->>Coordinator: Record Delivery (Wall Hit + Catch Attempt)
    Coordinator->>RulesEngine: validateDelivery(ballParams, matchRules)
    RulesEngine-->>Coordinator: RuleResult (Runs: 4, IsOut: false, WallRuleApplied: "wall_hit_four")
    Coordinator->>Reducer: applyEvent(currentInnings, verifiedEvent)
    Reducer-->>Coordinator: updatedInningsState
    Coordinator->>Storage: persistEvent(verifiedEvent)
    Coordinator-->>User: Render updated 60fps UI
```

### 3.2. Rule Categories & Evaluation Constraints

1. **One Tip One Hand Catch Validator:**
   - Validates that catches satisfy: $\text{bounces} \le \text{rule.maxBounces}$ and $\text{hands} = 1$.
   - Validates boundary wall contact restrictions: If ball touched boundary wall and `canTouchWallBeforeCatch === false`, dismissal is rejected and scored as runs.
2. **Mankad Run-Out Validator:**
   - Evaluates whether Mankad is permitted under active rules.
   - Requires non-striker ID and active bowler ID.
   - Never credits wicket to bowler; increments team wickets and marks batter out.
3. **Wall Boundary Outcome Engine:**
   - Evaluates ground-specific wall contact flags (`wallHit` vs `wallTap`).
   - Maps physical contact directly to rule outcomes (`four_runs`, `six_runs`, `dead_ball`, `custom_runs`, `out`).
   - Normal boundary four/six scoring runs parallel to and independent of wall scoring.
4. **Pace Call Evaluator (Pending Clarification):**
   - Architectural placeholder `PaceCallRule` is established in types.
   - Evaluator returns `status: "PENDING_SPECIFICATION"` until explicit rules are confirmed by the project lead.

---

## 4. Player Identity & Profile Architecture

### 4.1. Stable Identity Invariant
- **Rule:** A player's unique identity is represented by a permanent, immutable RFC4122 v4 UUID (`PlayerId`).
- **Name vs Identity Separation:**
  - `PlayerRecord.name` is the user's mutable current display name.
  - Matches snapshot the player's name at match creation time in `MatchRecord.teamSnapshots`.
  - Updating a player's profile name in the library propagates to future matches but preserves historical scorecards verbatim.
- **Multi-Team Association:**
  - Players are independent top-level entities stored in `players`.
  - `TeamRecord.playerIds` stores an array of foreign keys pointing to `PlayerId`.
  - A player can belong to $N$ teams simultaneously without duplicate records.

### 4.2. Player Merging Protocol
When duplicate player records are inadvertently created (e.g. "Rahul" and "Rahul Sharma"):
1. The user triggers `mergePlayers(sourcePlayerId, targetPlayerId)`.
2. All historical `BallEvent` records referencing `sourcePlayerId` (as batter, bowler, non-striker, or fielder) are remapped to `targetPlayerId`.
3. `TeamRecord.playerIds` lists are updated to deduplicate.
4. `sourcePlayerId` is marked with `deletedAt: Date.now()`.
5. An undo token with a 10-second rollback window is cached locally and enqueued to the outbox.

---

## 5. Team Branding & Avatar System Architecture

To avoid forcing users to upload image files on the field while providing rich team branding, PitchLog implements a **Vector Asset Resolution Engine**:

```mermaid
flowchart LR
    AvatarDef["TeamAvatar { type, assetId, primaryColor, secondaryColor, initials }"] --> Resolver{"Asset Resolver"}
    Resolver -->|"type: ANIMAL"| AnimalRegistry["Mascot SVG Registry (14 Icons)"]
    Resolver -->|"type: IPL"| IPLRegistry["IPL Franchise Registry (10 Teams)"]
    Resolver -->|"type: COUNTRY"| CountryRegistry["National Flag/Badge Registry"]
    Resolver -->|"type: INITIALS"| InitialsBadge["Dynamic 2-3 Letter SVG Canvas"]
    Resolver -->|"type: CUSTOM"| LocalImageStore["IndexedDB Blob / Cloud URL"]
```

### 5.1. Offline Asset Bundling
- Mascot and franchise icons are compiled as inline React SVG components or standard SVG paths bundled directly into the application chunk.
- No network requests are required to render team crests on scorecards or live broadcast headers.

---

## 6. Multilingual Architecture (i18n)

PitchLog supports **English**, **Hindi (हिंदी)**, and **Gujarati (ગુજરાતી)** across all cricket terminology:

```mermaid
flowchart TD
    LocaleState["Locale Context ('en' | 'hi' | 'gu')"] --> TranslationEngine["Translation Provider"]
    TranslationEngine --> TermCatalogue["Cricket Glossary"]
    TermCatalogue -->|"One Tip One Hand"| T1["One Tip One Hand / एक टप्पा एक हाथ / એક ટપ્પા એક હાથ"]
    TermCatalogue -->|"Wicket"| T2["Wicket / विकेट / વિકેટ"]
    TermCatalogue -->|"Bowled"| T3["Bowled / बोल्ड / બોલ્ડ"]
    TermCatalogue -->|"Dead Ball"| T4["Dead Ball / डेड बॉल / ડેડ બોલ"]
```

- Glossaries are partitioned into `common`, `rules`, `scoring`, `stats`, and `settings`.
- If a translation key is missing in Gujarati or Hindi, the system defaults gracefully to English without crashing.

---

## 7. Storage & Sync Architecture

### 7.1. IndexedDB Schema Evolution (Dexie v4)
- Version 4 stores:
  - `players`: `'id, name, battingStyle, bowlingStyle, deletedAt'`
  - `teams`: `'id, name, deletedAt'`
  - `matches`: `'id, date, status, updatedAt, shareToken, isLive, rulesPresetId'`
  - `matchRules`: `'id, matchId, presetName, version, createdAt'`
  - `deliveryAttempts`: `'id, matchId, inningsNo, sequence, timestamp'`
  - `ballEvents`: `'id, matchId, inningsNo, sequence, [matchId+sequence], deletedAt'`
  - `outbox`: `'id, type, entityId, matchId, createdAt, attempts'`

### 7.2. Outbox Synchronization Protocol
- All database writes are committed locally first inside an atomic Dexie transaction.
- Each mutation pushes a payload to `outbox`.
- Background `SyncWorker` dequeues batches, pushes idempotent upserts to Supabase with exponential backoff, and removes confirmed records.
- Cloud downtime or network failure never interrupts local scoring.
