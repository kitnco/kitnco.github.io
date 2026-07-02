# HANDOFF — Stride Run Training Plan App

_Last updated: Session 3, July 2026_

## Purpose

A flexible run-training-plan scheduler for a road runner who races halves/fulls
and shorter/trail races. Pick a templated plan, anchor to a race date, get an
editable week-by-week calendar with drag-to-rearrange workouts, accurate mileage
totals, and a persistent plan library synced across devices.

## Live site

**https://kitnco.github.io/**
Repo: `kitnco/kitnco.github.io` · `main` branch · root deploy

| File | Page |
|------|------|
| `index.html` | **Calendar** (main landing page) |
| `library.html` | **Plan Library** |

## What each page does

### index.html — Calendar

**Top bar (2 rows):**
- Row 1: editable race name (contenteditable h1) · [Calendar|Library] nav (right) · ⚙ sync gear · ☀/🌙 SVG toggle
- Row 2: Plan selector · Race date · Week starts on · Total mileage · mi/km toggle · Color by type switch + legend
- On mobile (<700px): row 2 collapses behind a ▾ expand button; only race name shows by default

**Calendar grid:**
- Left-anchored, `width:auto` table — tiles stay fixed-size, never stretch
- Week tiles: backwards-L border (right + bottom, 2.5px), heavier for current calendar week
- Week tile text: W# at 21px, date range at 12px, mileage total at 15px, 140px wide
- Day tiles: 146×118px. Inline-editable: type dropdown (plan-specific labels), distance field (accepts number/range/time), note textarea
- Drag any tile to swap workouts
- Color coding (off by default): Long Run = accent border only; Med-long = subtler accent border; LT = light yellow tint; MP = light green tint + accent border; VO2max = purple tint; Recovery = cool blue-gray tint; Rest/Cross-Train = neutral gray; Race = red tint + border

**Type labels come from YAML titles** — "Gen-aerobic", "Med-long run", "LT", "V̇O₂max", "Marathon-pace run", "Rest/Cross-Train", etc. Not generic buckets.

**Smart note cleaning** — `cleanNote()` strips only the first `{mi:km}` annotation per title (which duplicates the distance tile) and converts subsequent ones to "X mi" or "X km". This fixes previously broken notes like "Marathon-pace run with at marathon pace" (now correctly "Marathon-pace run with 10 mi at marathon pace") and "8K–15K tune-up race (total )" (now "8K–15K tune-up race (total 10-14 mi)").

**mi/km toggle** — converts all tile distances, weekly totals, and plan total live. Mathematical conversion (×1.60934).

**Library → Calendar handoff** — clicking "Use plan" in the library saves the full plan schedule to the Gist (`race.baseSchedule`) and navigates to index.html. The calendar reads this on load and uses it as the template, allowing any of the 89 library plans to display — not just the 3 embedded ones.

### library.html — Plan Library

**Layout:** Stride-style columnar rows (per the reference screenshot). Each row shows: Plan name + auto-generated subtitle · Race Type · Length · Range (min–max weekly) · Total miles · Peak miles · VIEW ▾.

**Grouping:** Plans grouped by author with a left accent-bar section header. Headers are drag-to-reorder (persists to Gist).

**Filters:** Distance-type pill filters above the plan list, inline with the search box and Upload button.

**Expanded panel** (click VIEW ▾): Stats (weeks/peak/low/total) · Mileage-by-week histogram (300px max-width, proportional scaling, no distortion) · Workout mix pills · Scrollable week-by-week schedule list.

**Delete:** Any plan (template or custom) with confirm dialog. Removes from local `library` array and persists to Gist.

**Upload:** Drag-drop or click-to-browse YAML/JSON. Parsed client-side via js-yaml CDN. Saved to Gist.

**Footer bar:** Shows library plan count · Total mileage of currently-expanded plan · Plan name being viewed.

## Persistence layer (Session 3)

**Architecture:** Two-tier.
- **Tier 1 — localStorage**: Instant read/write on every change. Works offline. Device-local only.
- **Tier 2 — GitHub Gist**: Private Gist (`stride-runplan.json`) synced ~1.8s after last change (debounced). Cross-device. Requires a GitHub PAT with `gist` scope only.

**State module** (`State` IIFE, identical copy inline in both HTML files, ~160 lines):
- `State.init()` — loads localStorage immediately, then fetches Gist in background. Called with `await` at setup start.
- `State.get(dotPath)` — read any value by dot-notation path
- `State.set(dotPath, value)` — write + trigger localStorage save immediately + debounced Gist push
- `State.connect(token)` — validates PAT, finds or creates the Gist, merges remote data
- `State.disconnect()` — removes PAT and gist ID from localStorage, sets status to offline
- `State.onStatus(cb)` — callback fires with `'offline' | 'pending' | 'syncing' | 'synced' | 'error'`

**Data schema** (in `stride-runplan.json`):
```json
{
  "v": 1,
  "prefs": { "dark": false, "unit": "mi", "colorCoding": false },
  "library": {
    "authorOrder": ["Pfitzinger/Douglas", "..."],
    "hiddenIds": [],
    "customPlans": []
  },
  "race": {
    "planId": "pfitz_18_70_4th",
    "raceName": "Philly Marathon 2026",
    "raceDate": "2026-11-22",
    "weekStartDay": 1,
    "baseSchedule": [[["Gen-aerobic","...", "8-9","13-14"], ...], ...],
    "baseMeta": { "name": "...", "type": "Marathon", "units": "mi" },
    "edits": { "weeks": [] }
  }
}
```

**What's persisted and when:**

| Data | Trigger | Storage |
|------|---------|---------|
| Dark mode, unit, color coding | Toggle click | localStorage + Gist |
| Race name | As you type (input event) | localStorage + Gist |
| Race date, week-start day | On change | localStorage + Gist |
| Active plan ID | On plan select | localStorage + Gist |
| Tile edits (drag/type/dist/note) | 600ms after last edit | localStorage + Gist |
| Library author order | After drag-reorder | localStorage + Gist |
| Custom plans | On add or delete | localStorage + Gist |
| baseSchedule | On "Use plan" click in Library | localStorage + Gist |

**PAT stored in localStorage only** (per-device, never in the Gist itself).

**Sync status indicator:** Small colored dot on the ⚙ gear button. Gray = offline, pulsing green = syncing/pending, solid green = synced, red = error.

**Settings modal:** Click the ⚙ gear on either page. Shows connect (paste token) or disconnect UI depending on status. Token entry field is `type=password`. Includes a direct link to the GitHub token creation page pre-scoped to `gist`.

**Conflict resolution:** Last-write-wins. Since there's only one user, simultaneous edits from two devices are rare. The Gist is the authoritative source on reconnect.

**Offline behavior:** All edits save to localStorage immediately. The Gist push queues and retries on the next successful network call. The status dot turns orange (pending) while queued.

## Deployment

From `~/kitnco.github.io/`:
```bash
git add .
git commit -m "describe changes"
git push
```
GitHub Pages rebuilds in ~1 minute. The PAT used for `git push` is the one stored in macOS Keychain (`git config --global credential.helper osxkeychain`). This is separate from the in-app sync PAT.

## Data notes (from source YAMLs)

- 89 plans from real YAMLs across 10 authors
- 3 `id` collisions in source YAMLs → worked around using filename as the plan ID
- 17 third/fourth-edition Pfitzinger pairs → disambiguated with "(3rd ed.)"/"(4th ed.)"
- 3 time-based plans (Couch to 5K variants) → `timeBased:true`, chart and mileage totals skipped
- Peak mileage computed from upper end of distance ranges

## What's next (priority order)

1. **Multiple active races** — currently "one race at a time" (`state.race`). Extending to multiple named races (each with their own plan/date/edits) requires changing `state.race` → `state.races[id]`. Decision needed on UI: a race selector dropdown in the topbar, plus a "create new race" flow. Starred race = default shown on load.

2. **Plan editor** — currently only duplicate-and-rename exists. A real workout-by-workout editor for building or heavily modifying a plan template. Should save result as a custom plan to the library (with the same YAML schema, stored in `state.library.customPlans`).

3. **Pace targets** — assigning goal paces (MP, LT, easy, VO2max) to a race, then surfacing those on each tile where relevant. Schema: add a `paces` object to `state.race`. UI: a pace target panel in the calendar topbar or an inline hint on each workout tile.

4. **Cloudflare Access** — lock `kitnco.github.io` to a single user email. Add Cloudflare DNS in front, enable the Zero Trust Access policy. No code changes to the app; this is pure infrastructure.

5. **Mobile view** — Stride-style day-by-day list view for iPhone/iPad. Needs a responsive breakpoint (~500px) that replaces the horizontal tile grid with a vertical daily list. The persistence layer is already in place, so this is purely a rendering/CSS concern.

6. **iCal sync** — for sharing the run schedule with a partner. Likely triggered manually (a "Sync to iCal" button). Generates an `.ics` file from the current race's week-by-week schedule. Needs to handle the race date anchor and the plan's start date. Could be hosted as a static `.ics` file on the GitHub Pages site and updated on demand.

7. **Menubar companion** — revisit after mobile view is done. A native Mac menubar widget showing the current week's workouts is the ideal end goal, but the web app covering Mac, iPhone, and iPad likely reduces the urgency.

## Files in repo

```
index.html      Calendar / main page (~58KB)
library.html    Plan Library (~444KB; large due to 89 embedded plan schedules)
README.md       Deployment instructions
HANDOFF.md      This file
.gitignore
```

**Note on file size:** `library.html` is large because the full schedule data for all 89 plans is embedded inline. This compresses to ~46KB on the wire (gzipped), which is fine for a web app. If it becomes a concern, the schedules could be split into a separate JSON file loaded on demand.
