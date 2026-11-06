# PitchLog 8-Zone Field Specification (FIELD_ZONES.md)

This document standardizes the 8-segment wagon wheel field zones for shot tracking in PitchLog.

## 1. Coordinate System & Perspective
- Perspective: Top-down aerial view of the cricket ground.
- Orientation: The striker stands at the bottom crease (6 o'clock relative to pitch center), facing straight down the pitch toward the bowler (12 o'clock).
- Center: Striker's batting crease position.
- Angles: Measured clockwise where 0° (12 o'clock) is straight down the pitch behind the bowler.

---

## 2. 8-Segment Zones (Right-Handed Batter Baseline)

| Zone | Name / Cricket Region | Angle Range (Degrees) | Typical Shots |
| :---: | :--- | :--- | :--- |
| **1** | **Straight / Long Off** | 337.5° – 22.5° (0° center) | Straight drive, lofted straight hit |
| **2** | **Cover / Extra Cover** | 22.5° – 67.5° (45° center) | Cover drive, inside-out loft, push through covers |
| **3** | **Point / Backward Point**| 67.5° – 112.5° (90° center) | Square cut, back-foot punch, steer to point |
| **4** | **Third Man** | 112.5° – 157.5° (135° center) | Late cut, edge / guide through slips/gully to 3rd man |
| **5** | **Fine Leg** | 157.5° – 202.5° (180° center) | Glance, sweep, paddle, upper cut to fine leg |
| **6** | **Square Leg** | 202.5° – 247.5° (225° center) | Pull shot, hook, leg glance, square whip |
| **7** | **Mid-Wicket** | 247.5° – 292.5° (270° center) | On-drive, flick off pads, cow corner slog |
| **8** | **Long On / Straight Mid-on**| 292.5° – 337.5° (315° center) | Straight on-drive, loft down the ground to long on |

---

## 3. Left-Handed Batter (LHB) Mirroring
When a batter has `leftHanded === true`:
The batter's physical perspective has off-side to the right (clockwise) and leg-side to the left (counter-clockwise).
To maintain consistent cricketing regions (e.g. "Cover" is always off-side drive for both RHB and LHB):

### Horizontal Mirror Mapping:
- **Zone 1** (Straight Off) $\longleftrightarrow$ **Zone 8** (Straight Leg)
- **Zone 2** (Cover) $\longleftrightarrow$ **Zone 7** (Mid-Wicket)
- **Zone 3** (Point) $\longleftrightarrow$ **Zone 6** (Square Leg)
- **Zone 4** (Third Man) $\longleftrightarrow$ **Zone 5** (Fine Leg)

Formula for mirroring:
```ts
export function getDisplayZone(zone: ShotZone, isLeftHanded?: boolean): ShotZone {
  if (!isLeftHanded) return zone
  const mirrorMap: Record<ShotZone, ShotZone> = {
    1: 8,
    2: 7,
    3: 6,
    4: 5,
    5: 4,
    6: 3,
    7: 2,
    8: 1,
  }
  return mirrorMap[zone]
}
```

---

## 4. Storage & Backward Compatibility
- Stored on `BallEvent`: optional field `shot?: { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }`.
- When `shot` is omitted, `shot` is `undefined`.
- Wagon wheel visualizations handle undefined shots gracefully: matches or balls without shot data are excluded from directional breakdowns and display a clear user message if no shots exist.
