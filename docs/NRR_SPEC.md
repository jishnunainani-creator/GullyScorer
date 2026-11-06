# PitchLog Net Run Rate (NRR) and Standings Specification

This document defines the mathematical formulas, base-6 over conventions, all-out rules, revised-target conventions, and tiebreaker procedures implemented in PitchLog.

---

## 1. Core Net Run Rate (NRR) Formula

Net Run Rate for any team across a tournament is defined as:

$$\text{NRR} = \left(\frac{\text{Total Runs Scored}}{\text{Total Overs Faced}}\right) - \left(\frac{\text{Total Runs Conceded}}{\text{Total Overs Bowled}}\right)$$

### Critical Cumulative Principle
NRR is **always summed across all counted matches** before dividing:
$$\text{NRR} = \frac{\sum \text{Runs For}}{\sum \text{Overs For}} - \frac{\sum \text{Runs Against}}{\sum \text{Overs Against}}$$
It is **never** an average of individual match NRRs.

---

## 2. Base-6 Overs Arithmetic

Cricket overs are measured in base-6 (6 legal deliveries per over).

- An over string of `"18.3"` represents $18 \text{ complete overs} + 3 \text{ balls}$.
- In decimal calculations:
  $$\text{Overs in Decimal} = \frac{\text{Total Legal Balls}}{6.0}$$
  $$\text{For } 18.3 \text{ overs} = \frac{18 \times 6 + 3}{6} = \frac{111}{6} = 18.500$$
- **Never** parse `"18.3"` as the decimal `18.3`. Doing so produces an arithmetic error of $18.5 - 18.3 = 0.2$ overs.
- **Overs Addition Rule**:
  Adding 3 overs 5 balls (23 balls) and 2 overs 4 balls (16 balls):
  $$23 + 16 = 39 \text{ balls} = 6 \text{ overs } 3 \text{ balls } (6.500 \text{ in decimal})$$
  *(Not $5.9$ or $6.3$).*

---

## 3. The All-Out Rule

When a team is bowled **ALL OUT** before completing their full allocation of overs:
- The overs charged to that team for NRR calculation is the **FULL quota of overs** they were allocated (e.g. 20.0 overs for a 20-over match), **not** the number of overs they actually faced.

### Worked Example A
- Match length: 20 overs (120 balls).
- Team A bats first and scores 150/6 in 20.0 overs.
- Team B is bowled all out for 140 in 18.3 overs (111 balls).

**Calculation for Team A:**
- Runs For = 150, Overs For = 20.0 (120 balls) $\rightarrow$ Run Rate For = $150 / 20 = 7.500$
- Runs Against = 140, Overs Against = 20.0 (Team B was all out, so full 20.0 is charged, not 18.5) $\rightarrow$ Run Rate Against = $140 / 20 = 7.000$
- **Team A NRR contribution** = $7.500 - 7.000 = +0.500$.

**Calculation for Team B:**
- Runs For = 140, Overs For = 20.0 (all-out penalty applies) $\rightarrow$ Run Rate For = $140 / 20 = 7.000$
- Runs Against = 150, Overs Against = 20.0 $\rightarrow$ Run Rate Against = $150 / 20 = 7.500$
- **Team B NRR contribution** = $7.000 - 7.500 = -0.500$.

---

## 4. Chasing Team Reaches Target

If the team batting second successfully chases the target (wins the match):
- Their **actual balls faced** are counted, because they were not all out.

### Worked Example B
- Match length: 20 overs.
- Team A scores 140 in 20.0 overs.
- Team B scores 141/4 in 15.0 overs to win the match.

**Calculation for Team B:**
- Runs For = 141, Overs For = 15.0 $\rightarrow$ Run Rate For = $141 / 15 = 9.400$
- Runs Against = 140, Overs Against = 20.0 $\rightarrow$ Run Rate Against = $140 / 20 = 7.000$
- **Team B NRR contribution** = $9.400 - 7.000 = +2.400$.

---

## 5. Revised Target Matches Convention

In rain-affected or reduced-overs matches where the team batting second has a revised target and revised overs quota (e.g., Target 100 in 12.0 overs after Team A scored 150 in 20.0 overs):
1. **Team 2 (Chasing):**
   - Quota = 12.0 overs (72 balls). If all out, 12.0 overs is used; if target is chased, actual balls faced is used.
2. **Team 1 (First Innings scaling):**
   - To make the run rates comparable, Team 1's score is proportionally scaled to Team 2's revised quota:
     $$\text{Scaled Runs} = \text{Team 1 Actual Runs} \times \left(\frac{\text{Revised Overs Quota}}{\text{Original Overs Quota}}\right)$$
   - The overs charged to Team 1 is the revised overs quota (12.0 overs).

### Worked Example C
- Original overs = 20.0 (120 balls). Team A scored 150 in 20.0 overs.
- Revised target for Team B = 100 in 12.0 overs (72 balls).
- Team B scores 90 all out in 11.2 overs.
- Scaled Team A Runs = $150 \times (12 / 20) = 90$ runs in 12.0 overs.
- Team B was all out, so their overs charged = 12.0 overs.
- Team A Run Rate For = $90 / 12 = 7.500$, Team A Run Rate Against = $90 / 12 = 7.500 \rightarrow \text{NRR} = 0.000$.

---

## 6. Exclusions from NRR

1. **Super Overs:**
   - Any balls bowled and runs scored in a Super Over (Innings 3 and 4) are strictly excluded from tournament NRR, runs for, and runs against.
2. **No-Result & Abandoned Matches:**
   - Matches ending with no result or abandoned without fulfilling minimum quota are excluded from NRR calculations. Points are awarded per `pointsRules.noResult`.
3. **Walkovers:**
   - When a walkover is awarded, win points are credited to the winning team and loss to the forfeiting team. No runs or overs are added to NRR.

---

## 7. Tie-Break Resolution Hierarchy

When teams finish on equal points, the standings rank is decided by `tournament.tiebreakOrder`:

1. **Points (`points`):** Highest total points.
2. **Most Wins (`wins`):** Team with more outright wins.
3. **Net Run Rate (`nrr`):** Higher cumulative NRR.
4. **Head-to-Head (`headToHead`):**
   - **Two-way tie:** The winner of the direct match between the two tied teams ranks higher.
   - **Three-or-more-way tie:** A mini-league is constructed including only matches played between the tied teams. Teams are ranked by points in the mini-league, then by mini-league NRR.
5. **Fewer Losses (`fewerLosses`):** Team with fewer total defeats.
6. **Manual Override (`manual`):** If explicitly set by the tournament organiser in `tournament.manualStandingsOrder`.

---

## 8. Mathematical Verification Invariants (Property Testing)

For any closed group or league:
1. $\sum_{\text{all teams}} \text{Runs For} = \sum_{\text{all teams}} \text{Runs Against}$
2. When every match has full quota overs faced, the sum of all teams' NRRs balances to zero:
   $$\sum_{i} \text{NRR}_i = 0$$
3. Total points awarded across all matches equals:
   $$\sum \text{Points} = (\text{Decisive Matches} \times \text{Win Points}) + (\text{Tied Matches} \times 2 \times \text{Tie Points}) + (\text{No Result Matches} \times 2 \times \text{NR Points})$$
