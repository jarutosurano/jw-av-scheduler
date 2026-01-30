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

# With skip option (for weeks already scheduled)
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
   - `engine.ts` - Core scheduling algorithm with priority order
   - `generator.ts` - Main entry point for generating monthly schedules

3. **Configuration** (`src/config/`)
   - `brothers.ts` - 18 brothers with privileges (Elder, MS, Publisher) and restrictions
   - `constraints.ts` - Meeting part constraints (no_av, no_mic)

4. **Web Interface** (`src/`)
   - Astro static site with sidebar navigation
   - Dashboard showing stats and latest schedule
   - Monthly schedule pages with print support

## Key Domain Concepts

### Privileges
- **Elders** (10): Full AV access, Auditorium Attendant eligible
- **Ministerial Servants** (4): Full AV access, Auditorium Attendant eligible
- **Publishers** (4): Limited access based on individual restrictions

### Special Restrictions
- **Xian Salazar**: Mic roving ONLY, max once per month; No Audio, Video, AV Assistant, or Entrance
- **Zach Lucero**: No Entrance Attendant
- **Cezar Macasieb**: No Auditorium Attendant
- **John Mahor**: No Auditorium Attendant

### WT Conductor Logic (Implicit)
- **Primary**: Jonas Santiso (default, not in PDF)
- **Backup**: Gally Villanueva (takes over if Jonas has Public Talk)

### Constraint Types
- **no_av**: Brother cannot have ANY AV assignment (Chairmen, CBS Chairman, WT Conductor)
- **no_mic**: Brother cannot be Mic Attendant (Bible Reader, Student Parts, WT Reader, etc.)

### AV Positions (Priority Order)
1. Audio, Video (most critical - schedule first)
2. A/V Assistant
3. Right Mic, Left Mic
4. Front/Stage Attendant
5. Auditorium Attendant (Elders/MS only)
6. Entrance Door Attendant 1 & 2

### Week Pairing
Same AV team serves both Midweek (Friday) and Weekend (Sunday) meetings.

## PDF Name Format

Hourglass PDFs use "LastName, FirstName" format (e.g., "Quinol, Randino"). The `doesNameMatchBrother()` function in `src/scheduler/availability.ts` handles matching with nickname mappings (Randino→Randy, Rafael→Raffy, etc.).

## Data Flow

1. User downloads midweek and weekend PDFs from Hourglass app
2. CLI parses PDFs to extract meeting parts and assigned brothers
3. Scheduler generates conflict-free AV assignments
4. JSON schedule saved to `src/data/schedules/YYYY-MM.json`
5. Astro builds static site with schedule data
6. GitHub Actions deploys to GitHub Pages

## Testing

Tests use Vitest. Key test files:
- `src/types/__tests__/index.test.ts` - Type validation
- `src/config/__tests__/brothers.test.ts` - Brother configuration
- `src/parser/__tests__/*.test.ts` - PDF parsing
- `src/scheduler/__tests__/*.test.ts` - Scheduling algorithm

All 38 tests should pass before committing.
