# HANDOFF — Stride Run Training Plan App

_Last updated: Session 2, July 2026_

## Purpose

A flexible run-training-plan scheduler for a road runner who races halves/fulls
and shorter/trail races. Pick a templated plan, anchor to a race date, get an
editable week-by-week calendar with drag-to-rearrange workouts, accurate mileage
totals, and a full plan library with schedule previews.

## Live site

**https://kitnco.github.io/**  
Repo: `kitnco/kitnco.github.io` · `main` branch · root deploy

| File | Page | URL |
|------|------|-----|
| `index.html` | **Calendar** (main landing page) | `kitnco.github.io/` |
| `library.html` | **Plan Library** | `kitnco.github.io/library.html` |

## What's in each page

### index.html — Calendar

- **2-row top bar**: Row 1 = editable race name, nav (Calendar|Library), ☀️/🌙 toggle.
  Row 2 = plan selector, race date, week-start day, total mileage, mi/km toggle,
  color-by-type switch + legend.
- **Editable race name** (`contenteditable` h1): type your race name directly,
  e.g. "Philly Marathon 2026".
- **Week tiles**: backwards-L border (right + bottom sides only, heavier weight).
  The current calendar week gets a darker border.
- **Day tiles**: 138×118px, larger text (19px distance, 11.5px note). Every tile
  is inline-editable — type dropdown (populated with the current plan's actual type
  labels), distance field (accepts single value, range, or time), multi-line note.
- **Drag-to-swap**: drag any tile onto another to swap workouts.
- **Type labels from YAML**: actual names extracted from workout titles — Gen-aerobic,
  Med-long run, LT, V̇O₂max, Marathon-pace run, etc. — not bucketed generic names.
- **Smart note cleaning**: The `{mi:km}` annotations in Pfitz titles are now handled:
  - First `{..}` in a title (duplicates the distance tile) → stripped
  - Subsequent `{..}` (embedded workout distances like "with {10:16} at MP") →
    shown as "10 mi" or "10 km" depending on active unit
  - Fixes "Marathon-pace run with at marathon pace" → "Marathon-pace run with 10 mi at marathon pace"
  - Fixes "8K–15K tune-up race (total )" → "8K–15K tune-up race"
- **Color coding** (off by default): 10 color buckets (rest, recovery, easy, med-long,
  long, LT, MP, VO2max, race, cross). Recovery is warm amber/tan, distinctly different
  from the cool-gray rest color.
- **Mi/km toggle**: converts all tile distances and totals live. Conversion is
  mathematical (×1.60934); for Pfitz plans the km values from the YAML annotations
  are used where available.
- **Responsive**: viewport meta tag, padding adjusts at 700px breakpoint.
- Only 3 plans embedded (Pfitz 18wk 55-70mi, half 12wk, 5K 8wk). Full library
  handoff via `?plan=<id>` URL param is plumbed but not yet acting on most plan IDs.

### library.html — Plan Library

- 89 real plans from uploaded YAMLs, grouped by author (drag headers to reorder).
- Click any row to expand: shows stats, mileage-by-week bar chart, workout mix pills,
  and a **Stride-style scrollable schedule preview** listing all weeks with each day's
  workout label and distance (like the reference Stride screenshot).
- Upload YAML/JSON → parsed client-side (js-yaml CDN) → adds to "Your custom plans".
- Duplicate & edit any plan → saves as custom.
- Delete any plan (template or custom), with confirmation dialog.
- Search + filter by distance type.
- ☀️/🌙 mode toggle. Light mode by default.

## Key decisions

- **Static HTML, no build step** — fast, trivially deployable to GitHub Pages.
- **Calendar is now `index.html`** (main landing page). Library is `library.html`.
  Previously library was `index.html` and calendar was `calendar.html`.
- **Type labels from YAML titles**, not pre-bucketed generic names. `extractTypeLabel()`
  strips `{..}` annotations and "with ..." clauses to get the clean type name.
  `getTypeBucket()` maps those to color buckets for optional color coding.
- **Smart note cleaning** via `cleanNote()` — handles the first-vs-subsequent
  `{mi:km}` annotation distinction. See the "Why notes were broken" section below.
- **Full schedule embedded in library** (compact `[label, note, dist_mi, dist_km]`
  arrays per day, ~384KB raw, ~30KB gzipped — fine for GitHub Pages serving).
- **No persistence yet** — all edits live in browser memory only.
- **No Amazon/source URLs** — stripped from all row display.
- **GitHub Pages auth**: site is public; Cloudflare Access planned for later.

## Why workout notes were missing info

The original `cleanTitle()` used `.replace(/\{[^}]*\}/g, "")` to strip ALL `{..}`
content. The Pfitz YAMLs use `{mi:km}` for two different purposes:
1. **Total distance annotation** (e.g. `{17-18:27-29}` right after the run type name)
   — this duplicates the distance tile, OK to strip
2. **Embedded workout distance** (e.g. `{10:16}` in "with {10:16} at marathon pace")
   — this is the KEY INFO for the workout, was being silently stripped

Fix: the new `cleanNote()` strips only the FIRST `{..}` per title, converts all
subsequent ones to "X mi" (or "X km"). Also fixes tune-up race notes like
`(total {10-14:16-23})` → shows as "(total 10-14 mi)" instead of "(total )".

The same issue applies to any plan that uses `{..}` annotations for embedded
distances — Daniels plans use this for rep distances, so the fix applies there too.

## Data notes (source YAML quality)

- 3 `id` collisions in source YAMLs (worked around using filename as ID)
- 17 third/fourth-edition Pfitzinger pairs (disambiguated with "(3rd ed.)"/"(4th ed.)")
- 3 time-based plans (Couch to 5K variants) flagged with `timeBased:true`, chart skipped
- Peak mileage computed from upper end of distance ranges (slightly above nominal label)

## Deploying changes

From `~/kitnco.github.io/`:
```bash
git add .
git commit -m "describe changes"
git push
```
GitHub Pages rebuilds in ~1 minute.

## What's next (priority order)

1. **Persistence** — browser memory only right now. Options:
   - iCloud Drive JSON (needs investigation; File System Access API won't reach iCloud
     Drive directly from a browser tab on Mac — may need a drag-to-load/save-file pattern
     as v1, or a small local helper script)
   - Firebase free tier (simplest true cross-device sync)
   - Decision needed before building anything else that saves state
2. **Library → Calendar data handoff** — `?plan=<id>` URL param is parsed in calendar
   but only 3 plan IDs map to embedded schedule data. Full handoff needs either:
   a) Move all 89 schedules into index.html too (makes it ~400KB like library)
   b) Load plan data from library.html via localStorage (needs persistence layer)
3. **Race name + starred plan** persistence (currently editable but lost on reload)
4. **Pace targets** — goal paces per plan (MP, LT, easy pace, etc.) — not started
5. **Cloudflare Access** — lock `kitnco.github.io` to single user email
6. **Mobile view** — Stride-style day-by-day list view for iPhone (later, with persistence)
7. **iCal sync** — for partner to view schedule (later, with persistence)
8. **Menubar companion** — revisit after persistence decision; may need native app

## Files in repo

```
index.html     Calendar (main page, ~38KB)
library.html   Plan Library (~415KB; large due to 89 embedded schedules)
README.md      Deployment instructions
HANDOFF.md     This file
.gitignore
```
