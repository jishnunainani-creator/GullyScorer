# PitchLog Stats Specification & Mathematical Formulas (STATS_SPEC.md)

This document specifies every formula, edge case, and qualifier rule used in the PitchLog stats engine (`src/stats/`).

---

## 1. Core Principles
1. **Derivation from Events:** Every statistic is derived exclusively from immutable `BallEvent[]` and `MatchRecord` snapshots.
2. **Zero Storage of Aggregates as Truth:** Statistics are computed pure functions. Local caches are purely disposable optimizations.
3. **Player Identity by ID:** Aggregations group strictly by `playerId`, never by player name.
4. **Tombstone & Undo Safety:** Soft-deleted events (`deleted_at !== null`) and undone deliveries are excluded.
5. **Match Completion Filter:** By default, only matches with `status === 'completed'` are included in career stats and leaderboards. An explicit `includeIncomplete` toggle allows inspecting in-progress matches.

---

## 2. Batting Statistics

### 2.1. Metrics & Formulas
- **Innings (`innings`):** A batter is credited with an innings if they either faced at least 1 delivery (legal or no-ball), was at the non-striker crease for at least 1 delivery, or was dismissed (e.g., diamond duck run-out without facing a ball).
- **Runs (`runs`):** Sum of `event.runsOffBat` across all deliveries where `event.batterId === playerId`. Extras (wides, byes, leg-byes, penalties) are **never** credited to the batter. Bat runs scored off a no-ball **are** credited to the batter.
- **Balls Faced (`ballsFaced`):** Count of deliveries where `event.batterId === playerId` and the delivery is **not** a wide.
  - Legal balls: Count as balls faced.
  - No-balls: Count as balls faced (the batter faced the bowler's delivery).
  - Wides: Do **not** count as balls faced (ball was wide of the batter).
- **Not Outs (`notOuts`):** Innings played where the batter was not dismissed (`isOut === false`). Note: `retired` batters are treated as not out unless marked out.
- **Dismissals (`dismissals`):** Count of innings where the batter was dismissed (`isOut === true`).
- **Batting Average (`average`):**
  $$\text{average} = \begin{cases} \dfrac{\text{runs}}{\text{dismissals}} & \text{if } \text{dismissals} > 0 \\ \text{undefined} & \text{if } \text{dismissals} = 0 \end{cases}$$
  *(In UI displays, undefined average with $>0$ runs displays as `runs*` or `—` with a tooltip indicating undefeated).*
- **Batting Strike Rate (`strikeRate`):**
  $$\text{strikeRate} = \begin{cases} \left(\dfrac{\text{runs}}{\text{ballsFaced}}\right) \times 100 & \text{if } \text{ballsFaced} > 0 \\ 0.00 & \text{if } \text{ballsFaced} = 0 \end{cases}$$
- **Highest Score (`highestScore`):** Max runs scored in any single innings, formatted with `*` if the batter remained not out in that innings (e.g., `84*` or `102`).
- **Milestone Counts:**
  - `thirties`: Innings with $30 \le \text{runs} < 50$
  - `fifties`: Innings with $50 \le \text{runs} < 100$
  - `centuries`: Innings with $\text{runs} \ge 100$
  - `ducks`: Innings with $\text{runs} = 0$ and $\text{isOut} = \text{true}$
  - `goldenDucks`: Dismissed on the 1st ball faced in the innings with 0 runs.
- **Boundary Percentages:**
  - $\text{boundaryRuns} = (\text{fours} \times 4) + (\text{sixes} \times 6)$
  - $\text{boundaryPercentage} = \begin{cases} \left(\dfrac{\text{boundaryRuns}}{\text{runs}}\right) \times 100 & \text{if } \text{runs} > 0 \\ 0.00 & \text{otherwise} \end{cases}$
- **Dot Ball Percentage Faced:**
  - Dot ball faced: Delivery where `runsOffBat === 0`, `extra === null`, and ball is faced.
  - $\text{dotBallPercentage} = \begin{cases} \left(\dfrac{\text{dotBalls}}{\text{ballsFaced}}\right) \times 100 & \text{if } \text{ballsFaced} > 0 \\ 0.00 & \text{otherwise} \end{cases}$

---

## 3. Bowling Statistics

### 3.1. Metrics & Formulas
- **Balls Bowled (`ballsBowled`):** Count of legal deliveries bowled by `event.bowlerId === playerId` (`isLegalDelivery(event) === true`).
- **Overs (`overs`):** $\lfloor\text{ballsBowled}/6\rfloor . (\text{ballsBowled}\bmod 6)$.
- **Runs Conceded (`runsConceded`):**
  $$\text{runsConceded} = \sum \text{runsOffBat} + \sum (\text{extra.runs} \text{ where type is 'wide' or 'noball'})$$
  *Byes, leg-byes, and penalty runs are fielding/match extras and are **never** charged to the bowler.*
- **Wickets Credited (`wickets`):** Dismissals of type `'bowled'`, `'caught'`, `'lbw'`, `'stumped'`, or `'hitwicket'`.
  *Run-outs and retired batters are **never** credited to the bowler.*
- **Bowling Average (`average`):**
  $$\text{average} = \begin{cases} \dfrac{\text{runsConceded}}{\text{wickets}} & \text{if } \text{wickets} > 0 \\ \text{undefined} & \text{if } \text{wickets} = 0 \end{cases}$$
- **Economy Rate (`economy`):**
  $$\text{economy} = \begin{cases} \left(\dfrac{\text{runsConceded}}{\text{ballsBowled}}\right) \times 6 & \text{if } \text{ballsBowled} > 0 \\ 0.00 & \text{if } \text{ballsBowled} = 0 \end{cases}$$
- **Bowling Strike Rate (`strikeRate`):**
  $$\text{strikeRate} = \begin{cases} \dfrac{\text{ballsBowled}}{\text{wickets}} & \text{if } \text{wickets} > 0 \\ \text{undefined} & \text{if } \text{wickets} = 0 \end{cases}$$
- **Maiden Overs (`maidens`):**
  An over of 6 legal deliveries bowled by that bowler where **0** bowler-chargeable runs were conceded across all deliveries of that over (including wides and no-balls bowled during that over).
- **Hauls:**
  - `threeWickets`: Innings with $\ge 3$ wickets.
  - `fiveWickets`: Innings with $\ge 5$ wickets.
- **Hat-Tricks (`hatTricks`):**
  3 consecutive dismissals credited to the same bowler across deliveries in the same match. Can span across over boundaries (e.g. balls 5 & 6 of over 1, and ball 1 of over 3). Excludes run-outs.

---

## 4. Fielding Statistics
- **Catches (`catches`):** Wickets where `wicket.type === 'caught'` and `wicket.fielderId === playerId`.
- **Run-Outs (`runOuts`):** Wickets where `wicket.type === 'runout'` and `wicket.fielderId === playerId`.
- **Stumpings (`stumpings`):** Wickets where `wicket.type === 'stumped'` and `wicket.fielderId === playerId`.

---

## 5. Phase Splits
Phase boundaries are derived dynamically from `matchConfig.oversPerInnings`:
- **Powerplay:** First $\max(1, \text{round}(\text{overs} \times 0.25))$ overs (e.g., overs 1–2 for 5–10 overs, overs 1–6 for 20 overs).
- **Middle Overs:** Overs following Powerplay up to the Death phase.
- **Death Overs:** Final $\max(1, \text{round}(\text{overs} \times 0.25))$ overs (e.g., overs 9–10 for 10 overs, overs 17–20 for 20 overs).

---

## 6. Player Roles
Determined by career activity thresholds:
- **Batter:** Career balls faced $\ge 30$, and $\text{ballsBowled} < 30$.
- **Bowler:** Career balls bowled $\ge 30$, and $\text{ballsFaced} < 30$.
- **All-Rounder:** Career balls faced $\ge 30$ and career balls bowled $\ge 30$.
- **Player (Developing / Gully):** Default role before reaching qualifiers.

---

## 7. MVP Points System Constants
Every action earns transparent points configurable in `src/stats/mvp.ts`:

| Action | Points |
| :--- | :---: |
| Run scored | +1 |
| Boundary 4 | +1 (cumulative with run = 5 total) |
| Boundary 6 | +2 (cumulative with run = 8 total) |
| Strike rate bonus ($>150$, min 10 balls) | +10 |
| Strike rate bonus ($>200$, min 10 balls) | +20 |
| Wicket taken | +25 |
| Dot ball bowled | +1 |
| Maiden over | +10 |
| Economy bonus ($<6.00$ in T20, scaled) | +10 |
| Catch taken | +10 |
| Run-out enacted | +15 |
| Stumping enacted | +15 |
| Duck dismissed (0 runs) | -5 |

Deterministic tie-breaker:
1. Higher wickets taken
2. Higher runs scored
3. Lower runs conceded
4. Player ID alphabetical sort
