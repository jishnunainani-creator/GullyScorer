# PitchLog Domain Data Models & Schema Specifications

**Document Version:** 2.0.0  
**Status:** Approved for Technical Design  
**Target Environments:** TypeScript Domain Engine, IndexedDB (Dexie v4), Supabase PostgreSQL  

---

## 1. Domain Types & Interfaces (`src/engine/types.ts` & `src/rules/types.ts`)

### 1.1. Player Domain Model

```typescript
export type BattingStyle = 
  | 'right_hand_bat' 
  | 'left_hand_bat';

export type BowlingStyle =
  | 'right_arm_fast'
  | 'right_arm_medium'
  | 'right_arm_spin_off'
  | 'right_arm_spin_leg'
  | 'left_arm_fast'
  | 'left_arm_medium'
  | 'left_arm_spin_orthodox'
  | 'left_arm_spin_chinaman'
  | 'none';

export interface PlayerAvatar {
  type: 'INITIALS' | 'CUSTOM_URL' | 'LOCAL_BLOB';
  imageUrl?: string;
  initials?: string;
  backgroundColor?: string;
}

export interface Player {
  /** Permanent, immutable RFC4122 v4 UUID */
  id: string;
  /** Current display name in user's library */
  name: string;
  /** Batting handedness (affects wagon wheel mirroring) */
  battingStyle: BattingStyle;
  /** Primary bowling style */
  bowlingStyle: BowlingStyle;
  /** Profile avatar */
  avatar?: PlayerAvatar;
  /** Phone number or contact for player sync (optional) */
  phoneNumber?: string;
  /** Audit timestamps */
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}
```

---

### 1.2. Team Domain Model & Avatar System

```typescript
export type TeamAvatarType = 
  | 'ANIMAL' 
  | 'IPL' 
  | 'COUNTRY' 
  | 'CUSTOM' 
  | 'INITIALS';

export interface TeamAvatar {
  /** Avatar classification */
  type: TeamAvatarType;
  /** Identifier from the internal vector asset registry (e.g. 'mascot_lion', 'ipl_csk', 'flag_in') */
  assetId?: string;
  /** User-uploaded custom image URL or local base64/blob */
  imageUrl?: string;
  /** Primary theme hex color (e.g. '#FDB913' for CSK yellow) */
  primaryColor?: string;
  /** Secondary theme hex color (e.g. '#0054A5' for CSK blue) */
  secondaryColor?: string;
  /** Fallback initials (e.g. 'XI', 'MI') */
  initials?: string;
}

export interface Team {
  /** Permanent, immutable UUID */
  id: string;
  /** Team name (e.g. "Royal Strikers XI") */
  name: string;
  /** Team identity crest/avatar */
  avatar: TeamAvatar;
  /** Member player UUIDs */
  playerIds: string[];
  /** Default captain */
  captainPlayerId?: string;
  /** Default vice-captain */
  viceCaptainPlayerId?: string;
  /** Audit timestamps */
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}
```

---

### 1.3. Match Rules System (`src/rules/types.ts`)

```typescript
export type RulePresetType =
  | 'standard_cricket'
  | 'gully_cricket'
  | 'tennis_ball_cricket'
  | 'society_cricket'
  | 'custom';

export interface OneTipOneHandRule {
  enabled: boolean;
  maxBounces: number; // typically 1
  maxHandsAllowed: number; // typically 1 (single-handed catch)
  canTouchWallBeforeCatch: boolean; // default false
  bowlerCredited: boolean; // default true
  dismissalLabel: string; // e.g. "One Tip One Hand"
}

export interface MankadRule {
  enabled: boolean;
  bowlerCredited: boolean; // false
  allowWarningFirst: boolean; // optional warning before out
}

export interface HitWicketRule {
  enabled: boolean; // default true
  bowlerCredited: boolean; // default true
  freeHitExemption: boolean; // default true (not out on free hit)
}

export type WallHitOutcome =
  | 'four_runs'
  | 'six_runs'
  | 'dead_ball'
  | 'out'
  | 'custom_runs';

export type WallTapOutcome =
  | 'one_run'
  | 'dead_ball'
  | 'boundary_four'
  | 'no_effect';

export interface WallRulesConfig {
  enabled: boolean;
  directHitOutcome: WallHitOutcome;
  directHitCustomRuns?: number;
  tapOutcome: WallTapOutcome;
  carOrWindowDirectHitOut: boolean;
  canCatchOffWall: boolean;
}

export interface PaceCallRule {
  /** PENDING CLARIFICATION: Placeholder for local bowling speed restrictions */
  enabled: boolean;
  status: 'PENDING_SPECIFICATION';
  notes?: string;
}

export interface DeadBallRule {
  allowManualDeclaration: boolean;
  defaultRepeatDelivery: boolean;
  awardPenaltyRuns: boolean;
  penaltyRunsAmount: number;
}

export interface MatchRules {
  id: string;
  presetName: RulePresetType;
  version: number;
  
  // Basic match structure
  oversPerInnings: number;
  ballsPerOver: number; // 4, 5, 6, 8, or 10
  playersPerSide: number;
  wicketsAllOut: number; // e.g. playersPerSide - 1 or custom
  lastManStands: boolean;

  // Gully & Local Rules
  oneTipOneHand: OneTipOneHandRule;
  mankad: MankadRule;
  hitWicket: HitWicketRule;
  wallRules: WallRulesConfig;
  paceCall: PaceCallRule;
  deadBall: DeadBallRule;

  // Standard Extras & Exemptions
  lbwEnabled: boolean;
  wideReBowl: boolean;
  wideRunsAwarded: number;
  noBallReBowl: boolean;
  noBallRunsAwarded: number;
  noBallFreeHit: boolean;
  byesEnabled: boolean;
  legByesEnabled: boolean;
  overthrowsEnabled: boolean;
  superOverOvers?: number;
}
```

---

## 2. Event Hierarchy & Event Sourcing Architecture

To prevent state corruption, events are strictly segregated into distinct polymorphic schemas.

### 2.1. Base Event

```typescript
export interface BaseMatchEvent {
  id: string;
  matchId: string;
  inningsNo: number;
  sequence: number;
  timestamp: number;
  deletedAt?: number | null;
}
```

### 2.2. Event 1: `DeliveryAttempt`
Captures an aborted or initiated run-up before ball is legally played.

```typescript
export type DeliveryAttemptOutcome =
  | 'completed'
  | 'aborted_runup'
  | 'ball_slipped'
  | 'mankad_attempt'
  | 'batsman_not_ready';

export interface DeliveryAttempt extends BaseMatchEvent {
  type: 'delivery_attempt';
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  attemptOutcome: DeliveryAttemptOutcome;
  abortReason?: string;
}
```

### 2.3. Event 2: `BallEvent` (Legal or Completed Extra Delivery)
Represents a delivery that reached the batter and resulted in runs, extras, wall contacts, or dismissals.

```typescript
export interface WallContactInfo {
  touchedWall: boolean;
  contactType: 'direct_hit' | 'ground_tap' | 'deflection';
  runsAwarded: number;
}

export interface BallEvent extends BaseMatchEvent {
  type: 'ball_event';
  bowlerId: string;
  batterId: string;
  nonStrikerId: string;
  runsOffBat: number;
  extra: ExtraInfo | null;
  wicket: WicketInfo | null;
  wallContact: WallContactInfo | null;
  isBoundary4: boolean;
  isBoundary6: boolean;
  shot?: { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 };
}
```

### 2.4. Event 3: `DeadBallEvent`
Represents an explicit halt of play.

```typescript
export type DeadBallReason =
  | 'animal_on_pitch'
  | 'passerby_interference'
  | 'ball_lost'
  | 'player_injured'
  | 'umpire_call'
  | 'gear_breakage'
  | 'other';

export interface DeadBallEvent extends BaseMatchEvent {
  type: 'dead_ball';
  bowlerId: string;
  strikerId: string;
  reason: DeadBallReason;
  customReasonNote?: string;
  countsAsLegalBall: boolean;
  runsAwarded: number; // penalty or completed runs prior to dead ball call
  mustReplayDelivery: boolean; // reball required
}
```

### 2.5. Event 4: `ReballOperation`
Preserves historical audit trail when a delivery is ordered to be replayed.

```typescript
export interface ReballOperation extends BaseMatchEvent {
  type: 'reball_operation';
  supersededEventId: string;
  reason: 'dead_ball' | 'umpire_error' | 'illegal_ball' | 'disputed_call';
  runsVoided: boolean;
  comment?: string;
}
```

### 2.6. Event 5: `WicketInfo` & Detailed Dismissal Types

```typescript
export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'one_tip_one_hand'
  | 'lbw'
  | 'runout'
  | 'stumped'
  | 'hitwicket'
  | 'wall_rule_out'
  | 'timed_out'
  | 'obstructing_field'
  | 'retired_out'
  | 'retired_hurt';

export type RunOutSubtype =
  | 'standard_runout'
  | 'mankad'
  | 'overthrow_runout';

export interface WicketInfo {
  type: DismissalType;
  playerOutId: string;
  bowlerId?: string; // present if credited to bowler
  fielderId?: string; // catcher or thrower
  runOutSubtype?: RunOutSubtype;
  bouncesBeforeCatch?: number; // for one_tip_one_hand
  wasOneHanded?: boolean; // for one_tip_one_hand
  crossingCompleted?: boolean; // whether batters crossed before dismissal
}
```

### 2.7. Event 6: `BatterRetirementEvent`

```typescript
export interface BatterRetirementEvent extends BaseMatchEvent {
  type: 'batter_retirement';
  playerId: string;
  retirementType: 'retired_hurt' | 'retired_out';
  incomingBatterId?: string;
}
```

---

## 3. Storage & Schema Specifications

### 3.1. IndexedDB Dexie Schema (Version 4)

```typescript
db.version(4).stores({
  players: 'id, name, battingStyle, bowlingStyle, deletedAt',
  teams: 'id, name, deletedAt',
  matches: 'id, date, status, updatedAt, shareToken, isLive, tournamentId, fixtureId, rulesPresetId',
  matchRules: 'id, matchId, presetName, version, createdAt',
  deliveryAttempts: 'id, matchId, inningsNo, sequence, timestamp',
  ballEvents: 'id, matchId, inningsNo, sequence, [matchId+sequence], deletedAt',
  deadBallEvents: 'id, matchId, inningsNo, sequence, timestamp',
  reballOperations: 'id, matchId, supersededEventId, timestamp',
  outbox: 'id, type, entityId, matchId, createdAt, attempts',
  tournaments: 'id, ownerId, status, isPublic, shareToken, updatedAt, deletedAt',
  tournamentTeams: 'id, tournamentId, teamId, groupId',
  fixtures: 'id, tournamentId, stage, round, groupId, matchId, status, updatedAt, deletedAt',
});
```

### 3.2. Supabase SQL Schema Extension (Draft for Future Cloud Migration)

```sql
-- Teams Table with Avatar JSONB
ALTER TABLE teams ADD COLUMN IF NOT EXISTS avatar JSONB DEFAULT '{"type":"INITIALS"}'::jsonb;

-- Players Table with Skills
ALTER TABLE players ADD COLUMN IF NOT EXISTS batting_style TEXT DEFAULT 'right_hand_bat';
ALTER TABLE players ADD COLUMN IF NOT EXISTS bowling_style TEXT DEFAULT 'none';
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar JSONB DEFAULT '{"type":"INITIALS"}'::jsonb;

-- Match Rules Table
CREATE TABLE IF NOT EXISTS match_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  rules_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive Delivery Events Table
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_no INT NOT NULL,
  sequence INT NOT NULL,
  attempt_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
