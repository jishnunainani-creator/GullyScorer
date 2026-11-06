# PitchLog Design System (DESIGN.md)

## 1. Palette & High-Contrast Sunlight Usability
Outdoor cricket scoring often happens under harsh sunlight. Generic gray-on-dark interfaces wash out. PitchLog uses an ultra-high contrast dark pitch palette:

- **Background Pitch Black:** `#080C0E` (Deepest pitch black for max battery and OLED contrast)
- **Card / Surface Dark:** `#121A1D` (Bordered with high-contrast `#233238`)
- **Primary Turf Accent:** `#22C55E` (Electric Turf Emerald, 500/400) — high-visibility cricket green
- **Urgent / Chase Accent:** `#F59E0B` (Amber 500) and `#EF4444` (Vibrant Crimson for wickets/tight chase)
- **High-Visibility Text:** `#FFFFFF` (100% white for numerals and batter names), `#E2E8F0` (subtext), `#94A3B8` (muted labels)

## 2. Typography & Numerals
- **Score & Over Display:** Bold condensed font with `font-mono font-black tabular-nums tracking-tighter`. Numerals are sized at `3.75rem` (60px) to `4.5rem` (72px) for instant glanceability from yards away.
- **Batters & Bowler Strip:** Clear tabular layout with active striker highlighted by glowing turf badge and bat indicator.

## 3. Ergonomics & Mobile-First Thumb Zone
- **Viewport Baseline:** 360px width min.
- **Thumb Zone Layout:** The live scoring screen is strictly non-scrolling (`h-screen overflow-hidden flex flex-col`).
- **Target Sizes:** Every primary keypad key is minimum 56px height (`min-h-[56px]`) with responsive flex grids to avoid accidental mis-taps.
- **Bottom Pad Structure:**
  - Row 1: `0`, `1`, `2`, `3`
  - Row 2: `4`, `6`, `5` (Custom/5)
  - Row 3: `Wd` (Wide), `Nb` (No-ball), `B/Lb` (Byes), `Wicket` (Crimson button)
  - Bottom Bar: Large `Undo`, `Mic` (Voice toggle), `Scorecard / Menu`

## 4. Haptic Feedback Specs
- Standard Ball: `navigator.vibrate(25)` (Crisp tactile tick)
- Boundary (4 or 6): `navigator.vibrate([40, 30, 60])` (Double pulse)
- Wicket: `navigator.vibrate([80, 50, 120, 50, 200])` (Heavy warning pulse)
- Undo / Error: `navigator.vibrate([30, 30, 30])` (Triple tick)
