# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JW AV Scheduler is an application that auto-generates audio/video assignments for Victoria Tagalog congregation meetings (Kitchener, ON). It parses Hourglass PDF exports to identify meeting parts and assigned brothers, then generates conflict-free AV schedules displayed on GitHub Pages.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Generate schedule from PDFs
pnpm generate --pdf midweek.pdf --pdf weekend.pdf --month 2026-02

# With skip option (for weeks not needed from PDF, e.g., Feb starts from week 2)
pnpm generate --pdf midweek.pdf --pdf weekend.pdf --month 2026-02 --skip 2026-02-06

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm typecheck

# Full CI check (run before committing)
pnpm ci:check
```

## Architecture

```
Hourglass PDFs → PDF Parser → Scheduler Engine → JSON Schedules → Astro Site → GitHub Pages
```

### Core Components

1. **PDF Parser** (`src/parser/`)
   - `pdf-extractor.ts` - Extracts text from PDFs using pdf-parse v1.1.1
   - `midweek-parser.ts` - Parses midweek meeting structure (Chairman, CBS, Spiritual Gems, Bible Reading, Student Parts)
   - `weekend-parser.ts` - Parses weekend meeting structure (Chairman, Public Talk Speaker, WT Reader)
   - `index.ts` - Combines parsers and handles WT Conductor logic

2. **Scheduler Engine** (`src/scheduler/`)
   - `availability.ts` - Determines who can be assigned based on constraints
   - `history.ts` - Tracks assignments for fair rotation
   - `engine.ts` - Core scheduling algorithm with priority order and priority brother guarantee
   - `generator.ts` - Main entry point for generating monthly schedules

3. **Configuration** (`src/config/`)
   - `brothers.ts` - 18 brothers with privileges (Elder, MS, Publisher) and restrictions
   - `constraints.ts` - Meeting part constraints (no_av, no_mic), position mappings, video-eligible brothers
   - `special-dates.ts` - Special dates calendar (Memorial, Circuit Assembly, etc.) that auto-apply during generation

4. **Web Interface** (`src/pages/`)
   - Astro static site with sidebar navigation
   - Dashboard (`index.astro`) showing stats and latest schedule
   - Monthly schedule pages (`schedule/[month].astro`) with print support and "Meeting Assignments" section (screen only)
   - Events page (`events.astro`) showing special calendar dates
   - Brothers page (`brothers.astro`) showing brothers, restrictions, and meeting part constraints

## Key Domain Concepts

### Privileges

- **Elders** (10): Full AV access, Auditorium Attendant eligible
- **Ministerial Servants** (4): Full AV access, Auditorium Attendant eligible
- **Publishers** (4): Limited access based on individual restrictions

### Brother Restriction Types

- `no_audio` - Cannot operate Audio
- `no_video` - Cannot operate Video
- `no_av_assistant` - Cannot be AV Assistant
- `no_mic` - Cannot be Right/Left Mic attendant
- `no_frontStage` - Cannot be Front/Stage Attendant
- `no_entrance` - Cannot be Entrance Door Attendant
- `no_auditorium` - Cannot be Auditorium Attendant
- `mic_once_monthly` - Can only do Mic once per month (handled with history tracking)

### Special Restrictions

- **Xian Salazar**: Mic roving ONLY, max once per month (`no_audio`, `no_video`, `no_av_assistant`, `no_frontStage`, `no_auditorium`, `no_entrance`, `mic_once_monthly`)
- **Zach Lucero**: No Entrance Attendant (`no_entrance`); **Priority brother** — guaranteed assignment every week (engine swaps him in if not naturally selected)
- **Cezar Macasieb**: No Auditorium Attendant (`no_auditorium`)
- **John Mahor**: No Auditorium Attendant (`no_auditorium`); **Priority brother** — guaranteed assignment every week (Mic, Entrance preferred)
- **Raffy Mondares**: No Video (`no_video`)
- **Randy Quinol**: No Video (`no_video`)
- **Melky Basanes**: No Video (`no_video`)
- **Edgar Silverio**: No Video (`no_video`)
- **Edmer Sapla**: No Video (`no_video`)

### WT Conductor Logic (Implicit)

- **Primary**: Jonas Santiso (default, not in PDF)
- **Backup**: Gally Villanueva (takes over if Jonas has Public Talk)

### Meeting Part Constraints

When a brother has a meeting part, these constraints determine which AV positions they cannot hold that week:

- **no_av** (cannot have ANY AV assignment):
  - Midweek Chairman, CBS Conductor
  - Weekend Chairman, Public Talk Speaker, WT Conductor

- **no_mic** (cannot be Right/Left Mic attendant):
  - Treasures Talk, Spiritual Gems, Bible Reading, CBS Reader, WT Reader

- **none** (no restriction - can still do AV):
  - Opening Prayer, Student Talk (5-min Apply Yourself parts, not Public Talk), Living as Christians, Closing Prayer

### AV Positions (Priority Order)

1. Audio, Video (most critical - schedule first)
2. A/V Assistant
3. Right Mic, Left Mic
4. Front/Stage Attendant
5. Auditorium Attendant (Elders/MS only)
6. Entrance Door Attendant 1 & 2

### Scheduling Score Logic

The engine assigns AV positions using a scoring system (lower score = assigned first):

- **Meeting part penalty**: Brothers with meeting parts that week are strongly deprioritized (+200 base + 50 per part). Brothers with zero assignments always get AV first.
- **Privilege-based**: MS get a boost (-15), publishers get a slight boost (-10), Elders get a slight penalty (+15). MS are assistants and should do more AV.
- **Priority brothers**: Zach Lucero is guaranteed a weekly assignment via post-scheduling swap.
- **Fair rotation**: History-based scoring prevents the same brother from being assigned the same position repeatedly.

### Week Pairing

Same AV team serves both Midweek (Friday) and Weekend (Sunday) meetings.

## PDF Name Format

Hourglass PDFs use "LastName, FirstName" format (e.g., "Quinol, Randino"). The `doesNameMatchBrother()` function in `src/scheduler/availability.ts` handles matching with nickname mappings (Randino→Randy, Rafael→Raffy, etc.) and accent stripping (Peñera→Penera).

### Special Dates

Special dates are defined in `src/config/special-dates.ts` and auto-apply during schedule generation. They take priority over PDF data:

- **weekendOnly**: No midweek meeting but weekend still happens (e.g., Memorial)
- **noMeeting**: No meetings at all that week (e.g., Circuit Assembly, Convention)

## Data Flow

1. User downloads midweek and weekend PDFs from Hourglass app
2. CLI parses PDFs to extract meeting parts and assigned brothers
3. Special dates from `src/config/special-dates.ts` override PDF data automatically
4. Scheduler generates conflict-free AV assignments
5. JSON schedule saved to `schedules/YYYY-MM.json` (includes `meetingParts` with midweek/weekend parts)
6. Astro builds static site with schedule data
7. GitHub Actions deploys to GitHub Pages

### Video-Eligible Brothers

Video position uses a fair rotation among a specific subset of brothers defined in `videoEligibleBrotherIds` in `constraints.ts`. Includes select MS, publishers, and elders.

## Testing

Tests use Vitest. Key test files:

- `src/config/constraints.test.ts` - Constraint configuration and position logic
- `src/parser/parser.test.ts` - PDF parsing
- `src/scheduler/scheduler.test.ts` - Scheduling algorithm

Run `pnpm test` before committing.
