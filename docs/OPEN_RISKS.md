# Gully Cricket Scorer — Open Risks & Unresolved Questions (`docs/OPEN_RISKS.md`)

**Document Version:** 2.0.0  
**Status:** Active Architectural Assessment  
**Last Updated:** November 2026  

---

## 1. Unresolved Cricket-Rule Questions & Ambiguities

### 1.1. Pace Call Rule Mechanics (CRITICAL — PENDING CLARIFICATION)
* **Ambiguity:** The user requirements specify "Pace Call" as a configurable local rule, but note that "its exact behaviour is not yet confirmed."
* **Open Questions:**
  1. **Trigger Timing:** Is a Pace Call declared by the batter *before* the bowler begins their run-up, by the umpire *during* the delivery, or called *after* the ball is released based on perceived speed?
  2. **Penalty Structure:** If a bowler violates the pace call (bowls too fast in a designated slow/spin over):
     - Is it ruled a **Dead Ball** (ball re-bowled, no runs, no wickets)?
     - Is it ruled a **No-Ball** (1 penalty run awarded to batting team, re-bowled, possible Free Hit)?
     - Does it incur a **Formal Warning** first, with penalties applying only on subsequent infractions?
  3. **Wicket Validity:** If a batter is dismissed on a delivery where a pace call is subsequently disputed, is the dismissal voided?
  4. **Subjectivity:** Without radar speed guns on gully pitches, who has the final authority to declare a delivery as exceeding the pace limit (Umpire, batting captain, or consensus)?
* **Architectural Stance:** Documented in domain types as `PaceCallRule { enabled: boolean; status: 'PENDING_SPECIFICATION' }`. **Zero speculative code will be introduced until formal clarification is provided by the project lead.**

---

### 1.2. One Tip One Hand Ground Wall Rebound Permutations
* **Ambiguity:** In extreme narrow street environments, a ball might bounce on the ground, hit a compound wall, and then be caught with one hand.
* **Open Questions:**
  1. Does striking an inanimate obstacle (wall, electric pole, tree, parked car) immediately deaden the ball, or can local ground rules allow catches off wall rebounds?
* **Architectural Stance:** Made strictly configurable via `canTouchWallBeforeCatch: boolean` (Default: `false`).

---

### 1.3. Last Man Standing (LMS) Strike & Running Invariants
* **Ambiguity:** When only one batter remains ($N-1$ wickets fallen):
  1. If the lone batter runs an odd number of runs (1 or 3), which crease do they occupy for the next ball?
  2. In gully cricket, the lone batter usually runs from one end to the other and must run back (double-run rule) to score 1, or they simply stay at the striker's end for every ball.
* **Architectural Stance:** Standard PitchLog LMS keeps `currentNonStrikerId = null` with the batter always receiving strike at the striker's end. We should verify if "double running" (running up and down for 1 run) needs a rule toggle in Phase 2.

---

## 2. Technical & Architectural Risks

| Risk ID | Description | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **TR-01** | **IndexedDB Schema Migration (v3 $\to$ v4):** Existing field-tested user databases on devices must smoothly upgrade without data loss when adding `matchRules`, `deliveryAttempts`, and `deadBallEvents`. | High | Medium | Implement declarative Dexie version upgrades with automated regression migration tests. All new stores and columns are strictly additive. |
| **TR-02** | **Polymorphic Event Reducer Performance:** Expanding `BallEvent` into a discriminated union of `DeliveryAttempt`, `BallEvent`, `DeadBallEvent`, and `ReballOperation` could impact state derivation latency if not carefully typed. | Medium | Low | Ensure all events share a compact common discriminator (`type: string`). Retain integer sequence indexing. Pure reducer benchmarks have confirmed $<15\text{ ms}$ processing time for 200 matches. |
| **TR-03** | **Player Identity Divergence on Merges:** Merging two duplicate players re-points historical events. If a network sync occurs mid-merge, remote viewers could temporarily see inconsistent IDs. | Medium | Low | Atomic local IndexedDB transactions. Outbox records enqueue idempotent bulk remapping operations. |
| **TR-04** | **IPL & Intellectual Property Compliance:** Using official names, logos, or commercial insignias of IPL franchises could lead to trademark infringement issues. | High | Medium | Use team city names, franchise abbreviations (CSK, MI, RCB), team brand colors, and custom original vector mascots. Never distribute copyrighted SVG vector logos without explicit licensing. |
| **TR-05** | **Offline Image Asset Storage:** Allowing users to upload high-resolution custom logos on mobile devices can exhaust browser IndexedDB storage quotas. | Medium | Medium | Downscale custom uploaded images on the client (canvas resized to $256 \times 256$ WebP, $<50\text{ KB}$) before persisting locally. |
| **TR-06** | **Multilingual Font Rendering & Cricket Slang:** In Hindi and Gujarati, street cricket slang varies by district (e.g. "एक टप्पा" in Delhi/UP vs "सिंगल टप्पा" in Gujarat/Maharashtra). | Low | Medium | Standardize on formal localized Hindi/Gujarati cricket terms with clear contextual subtitles, and provide English phonetic fallbacks. |

---

## 3. Recommended Next Steps for Project Lead Approval

1. **Review & Approve D023–D035** in `docs/DECISIONS.md`.
2. **Clarify Pace Call Rule Trigger & Penalty** to resolve Open Risk 1.1.
3. **Approve Schema & Type Definitions** in `docs/DATA_MODEL.md` before engine implementation.
4. **Confirm Team Avatar Mascot Set** (14 vector mascots + 10 IPL franchise color mappings).
