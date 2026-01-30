# JW AV Scheduler - Roadmap

> Auto-generate audio/video assignments for congregation meetings without conflicts.

---

## Overview

This application automates the scheduling of AV (Audio/Video) assignments for the Victoria Tagalog congregation's midweek and weekend meetings. It parses Hourglass PDF exports to identify meeting parts and their assigned brothers, then generates conflict-free AV schedules.

---

## Brothers & Privileges

### Elders
| Name | Notes |
|------|-------|
| Jonas Santiso | Default WT Conductor |
| Dandel Cabusas | |
| Raffy Mondares | |
| Randy Quinol | |
| Matt Mancuso | |
| Melky Basanes | |
| Gally Villanueva | Backup WT Conductor |
| Abraham Peñera | |
| Herman Lucero | |
| Edgar Silverio | |

### Ministerial Servants
| Name | Notes |
|------|-------|
| Jayr Sullano | |
| Edmer Sapla | |
| Jared Nieva | |
| Ralph Arugay | |

### Other Brothers (Unbaptized/Unassigned)
| Name | Restrictions |
|------|--------------|
| Zach Lucero | Cannot be assigned to Entrance Attendant |
| Cezar Macasieb | Cannot be assigned to Auditorium Attendant |
| John Mahor | Cannot be assigned to Auditorium Attendant |
| Xian Salazar | Mic roving ONLY, max once per month; No Audio, Video, AV Assistant, or Entrance |

---

## Meeting Structure

### Midweek Meeting (Friday Night)

| Part | AV Constraint |
|------|---------------|
| Chairman | **NO AV ASSIGNMENTS** |
| 10 min Talk (Treasures) | Can be assigned to AV (optional) |
| Espirituwal na Hiyas (10 min) | No Mic Attendant |
| Bible Reader (Pagbabasa ng Bibliya) | No Mic Attendant |
| Student Parts (3/4/5 min Maging Mahusay) | No Mic Attendant |
| Living as Christians parts | No restriction |
| CBS Chairman | **NO AV ASSIGNMENTS** |
| CBS Reader | No Mic Attendant |

### Weekend Meeting (Sunday Evening)

| Part | AV Constraint |
|------|---------------|
| Chairman | No Mic Attendant |
| Public Talk Speaker | No Mic Attendant |
| WT Conductor | **NO AV ASSIGNMENTS** |
| WT Reader | No Mic Attendant |

#### WT Conductor Logic (Implicit Role)
- **Primary:** Jonas Santiso (default, always unless unavailable)
- **Backup:** Gally Villanueva (takes over if Jonas has Public Talk)
- This role is NOT in the Hourglass PDF - it's implied and handled by the scheduler

---

## AV Assignments

| Position | Eligible Brothers |
|----------|-------------------|
| Audio | All except Xian |
| Video | All except Xian |
| A/V Assistant | All except Xian |
| Right Mic | All (Xian max once/month) |
| Left Mic | All (Xian max once/month) |
| Front/Stage Attendant | All |
| Auditorium Attendant | **Elders & MS only** |
| Entrance Door Attendant 1 | All except Xian, Zach |
| Entrance Door Attendant 2 | All except Xian, Zach |

---

## Scheduling Rules

### Priority Order
1. Schedule **Audio** and **Video** first (most critical positions)
2. Then A/V Assistant
3. Then Mic Attendants
4. Then Attendants (Front/Stage, Auditorium, Entrance)

### Week Pairing
- Midweek (Friday) and Weekend (Sunday) share the **same AV team**
- Example: Feb 6 & 8 = same assignments

### Constraint Summary

| Constraint Type | Affected Positions |
|-----------------|-------------------|
| **No AV at all** | Midweek Chairman, CBS Chairman, WT Conductor |
| **No Mic** | Espirituwal na Hiyas, Bible Reader, Student Parts, CBS Reader, Weekend Chairman, Public Talk, WT Reader |

### Special Rules
1. **Xian Salazar** - Mic only, once per month maximum
2. **Zach Lucero** - No Entrance Attendant
3. **Cezar Macasieb** - No Auditorium Attendant
4. **John Mahor** - No Auditorium Attendant
5. **Auditorium Attendant** - Elders and MS only

### Fair Distribution
- Track assignment history to ensure even rotation
- Avoid assigning the same brother to the same position repeatedly
- Balance workload across all eligible brothers

---

## Data Flow

```
┌─────────────────────┐
│  Hourglass PDFs     │
│  - midweek_YYYY-MM  │
│  - weekend_YYYY-MM  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  PDF Parser         │
│  - Extract dates    │
│  - Extract parts    │
│  - Extract brothers │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Scheduler Engine   │◄────│  Brothers Config    │
│  - Apply constraints│     │  - Privileges       │
│  - Check conflicts  │     │  - Restrictions     │
│  - Fair rotation    │     └─────────────────────┘
│  - Generate schedule│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Schedule Output    │────►│  GitHub Pages       │
│  - JSON files       │     │  - Dashboard        │
│  - History tracking │     │  - Monthly view     │
└─────────────────────┘     │  - Print view       │
                            └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js + TypeScript | Type-safe scheduling logic |
| PDF Parsing | pdf-parse | Extract text from Hourglass PDFs |
| Web Framework | Astro + React | Static site for GitHub Pages |
| Styling | Tailwind CSS | Clean, responsive UI |
| Data Storage | JSON files | Brothers config, schedules, history |
| Deployment | GitHub Actions | Auto-deploy to GitHub Pages |

---

## Project Structure

```
jw-av-scheduler/
├── src/
│   ├── config/
│   │   ├── brothers.ts          # Brother profiles & privileges
│   │   └── constraints.ts       # Assignment rules & restrictions
│   │
│   ├── parser/
│   │   ├── pdf-parser.ts        # Hourglass PDF text extraction
│   │   ├── midweek-parser.ts    # Midweek meeting structure
│   │   └── weekend-parser.ts    # Weekend meeting structure
│   │
│   ├── scheduler/
│   │   ├── engine.ts            # Core scheduling algorithm
│   │   ├── constraints.ts       # Constraint validation
│   │   ├── availability.ts      # Check who's available
│   │   └── history.ts           # Track past assignments
│   │
│   ├── cli/
│   │   └── generate.ts          # CLI entry point
│   │
│   └── web/                     # Astro site
│       ├── pages/
│       │   ├── index.astro      # Dashboard
│       │   └── [month].astro    # Monthly schedule view
│       ├── components/
│       │   ├── Sidebar.astro    # Month/year navigation
│       │   ├── ScheduleTable.astro
│       │   └── ConflictWarning.astro
│       └── layouts/
│           └── Layout.astro
│
├── data/
│   ├── brothers.json            # Brother data
│   └── history.json             # Assignment history
│
├── schedules/                   # Generated outputs
│   └── 2026-02.json
│
├── pdfs/                        # Hourglass PDF inputs
│   ├── midweek_2026-02.pdf
│   └── weekend_2026-02.pdf
│
└── public/                      # Static assets
```

---

## Phases

### Phase 1: Foundation
- [x] Define requirements and constraints
- [ ] Initialize project (TypeScript, pnpm, Astro)
- [ ] Create brother data model and configuration
- [ ] Create constraint definitions
- [ ] Set up project structure

### Phase 2: PDF Parser
- [ ] Implement PDF text extraction
- [ ] Parse midweek meeting structure
- [ ] Parse weekend meeting structure
- [ ] Extract dates, parts, and assigned brothers
- [ ] Handle WT Conductor implied logic

### Phase 3: Scheduler Engine
- [ ] Build availability checker (who can be assigned)
- [ ] Implement constraint validation
- [ ] Create scheduling algorithm with priority order
- [ ] Add fair rotation logic
- [ ] Track assignment history
- [ ] Generate weekly AV schedules

### Phase 4: CLI Tool
- [ ] Create CLI entry point
- [ ] Accept PDF file paths as input
- [ ] Output generated schedule as JSON
- [ ] Add preview/dry-run mode
- [ ] Add conflict reporting

### Phase 5: Web Interface
- [ ] Set up Astro project structure
- [ ] Build sidebar navigation (months/years)
- [ ] Create schedule table component
- [ ] Build dashboard with stats
- [ ] Add print-friendly styles
- [ ] Deploy to GitHub Pages

### Phase 6: Polish & Automation
- [ ] GitHub Actions for auto-deployment
- [ ] Schedule export (PDF/Excel)
- [ ] Manual override capability
- [ ] Conflict warnings and alerts
- [ ] Documentation

---

## UI Mockup

```
┌──────────────────────────────────────────────────────────────────┐
│  JW AV Scheduler                              [Generate] [Print] │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│  2026          │  February 2026 - AV Schedule                    │
│  ├─ January    │                                                 │
│  ├─ February ◄ │  ┌────────────────┬─────────┬─────────┬───────┐ │
│  ├─ March      │  │ Assignment     │ Feb 6-8 │ Feb 13-15│ ...  │ │
│  └─ ...        │  ├────────────────┼─────────┼─────────┼───────┤ │
│                │  │ Audio          │ Dandel  │ Raffy   │       │ │
│  2025          │  │ Video          │ Herman  │ Edgar   │       │ │
│  └─ ...        │  │ A/V Assistant  │ Jared   │ Ralph   │       │ │
│                │  │ Right Mic      │ Zach    │ John    │       │ │
│                │  │ Left Mic       │ Cezar   │ Zach    │       │ │
│                │  │ Front/Stage    │ Abraham │ Melky   │       │ │
│                │  │ Auditorium     │ Jayr    │ Edmer   │       │ │
│                │  │ Entrance 1     │ Randy   │ Dandel  │       │ │
│                │  │ Entrance 2     │ Raffy   │ Herman  │       │ │
│                │  └────────────────┴─────────┴─────────┴───────┘ │
│                │                                                 │
│                │  Conflicts: None                                │
└────────────────┴─────────────────────────────────────────────────┘
```

---

## Schedule Output Format

```json
{
  "month": "2026-02",
  "generated": "2026-01-30T12:00:00Z",
  "weeks": [
    {
      "weekOf": "2026-02-06",
      "midweekDate": "2026-02-06",
      "weekendDate": "2026-02-08",
      "assignments": {
        "audio": "Dandel Cabusas",
        "video": "Herman Lucero",
        "avAssistant": "Jared Nieva",
        "rightMic": "Zach Lucero",
        "leftMic": "Cezar Macasieb",
        "frontStage": "Abraham Peñera",
        "auditorium": "Jayr Sullano",
        "entrance1": "Randy Quinol",
        "entrance2": "Raffy Mondares"
      },
      "unavailable": {
        "noAV": ["Gally Villanueva", "Matt Mancuso", "Jonas Santiso"],
        "noMic": ["Edmer Sapla", "Xian Salazar", "Randy Quinol", "Cezar Macasieb", "Jayr Sullano"]
      }
    }
  ]
}
```

---

## Goals Checklist

- [ ] Auto-generate AV assignments without conflicts
- [ ] Parse Hourglass PDF exports (midweek + weekend)
- [ ] Handle WT Conductor implied role (Jonas/Gally)
- [ ] Enforce all brother restrictions (Xian, Zach, Cezar, John)
- [ ] Ensure fair rotation via history tracking
- [ ] Display schedule on GitHub Pages with sidebar navigation
- [ ] Flexible, robust, secure, and scalable architecture

---

## Notes

- Schedule is for **one week** spanning Friday (midweek) and Sunday (weekend)
- Same AV team serves both meetings in a week
- Hourglass PDFs are the source of truth for meeting parts
- History tracking ensures fair distribution over time
- **Feb 6 & 8, 2026** - Schedule already exists, skip this week
- **Start generating from Feb 13 & 15, 2026**

---

## PDF File Management

### Auto-Cleanup Script
After schedule generation, PDF files should be automatically deleted to:
- Keep the repository clean and lightweight
- Avoid storing unnecessary files in version control
- Reduce storage costs on GitHub

**Implementation:**
```bash
# Post-generation cleanup (part of CLI)
pnpm generate --pdf ./midweek.pdf ./weekend.pdf --cleanup
```

The `--cleanup` flag will:
1. Parse the PDFs
2. Generate the schedule
3. Delete the PDF files automatically
4. Only commit the generated JSON schedule

**Alternative:** Add PDFs to `.gitignore` so they're never committed:
```gitignore
# Hourglass PDF files (processed locally, not committed)
*.pdf
pdfs/
```

> **Note:** PDF file size is minimal (~200-300KB each), but keeping the repo clean is good practice.

---

## Security Procedures

### Code Security
- [ ] No secrets or API keys in code (use environment variables if needed)
- [ ] No personal data beyond brother names (which are public in congregation)
- [ ] Input validation on PDF parsing (prevent malformed PDFs from breaking app)
- [ ] Sanitize all user inputs before rendering in UI

### Dependency Security
- [ ] Use `pnpm audit` to check for vulnerabilities before each release
- [ ] Keep dependencies updated with `pnpm update`
- [ ] Lock dependency versions in `pnpm-lock.yaml`
- [ ] Review new dependencies before adding (check npm stats, maintenance)

### GitHub Pages Security
- [ ] Enable HTTPS (default on GitHub Pages)
- [ ] No sensitive data in generated static files
- [ ] Use Content Security Policy (CSP) headers via meta tags
- [ ] Set appropriate cache headers for static assets

### Repository Security
- [ ] Enable branch protection on `main`
- [ ] Require PR reviews before merging (optional for solo project)
- [ ] Enable Dependabot alerts for security vulnerabilities
- [ ] Use `.gitignore` to prevent accidental commits of sensitive files

---

## Testing Procedures

### Unit Tests
- [ ] Test PDF parser with sample Hourglass exports
- [ ] Test constraint validation logic
- [ ] Test scheduling algorithm edge cases
- [ ] Test fair rotation distribution

### Integration Tests
- [ ] Test full pipeline: PDF → Parser → Scheduler → JSON output
- [ ] Test GitHub Actions deployment workflow
- [ ] Test static site generation

### Manual Testing Checklist
Before each deployment:
- [ ] Generate schedule with sample PDFs
- [ ] Verify no constraint violations in output
- [ ] Check UI renders correctly on desktop/mobile
- [ ] Test print view formatting
- [ ] Verify all links work
- [ ] Check accessibility (keyboard navigation, screen reader)

### Test Commands
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Full CI check (run before committing)
pnpm ci:check
```

---

## Git Workflow & Standards

### Branch Strategy
```
main (production)
  └── feat/feature-name    # New features
  └── fix/bug-description  # Bug fixes
  └── chore/task-name      # Maintenance tasks
  └── docs/update-name     # Documentation updates
```

### Commit Message Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no feature/fix) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks (deps, build, etc.) |

**Examples:**
```bash
feat(scheduler): add fair rotation algorithm
fix(parser): handle empty PDF pages gracefully
docs(readme): update installation instructions
chore(deps): upgrade astro to v4.0
test(constraints): add edge case for Xian mic limit
```

### Pre-Commit Checks
Using Husky + lint-staged:
```bash
# Runs automatically before each commit
- pnpm lint          # ESLint
- pnpm typecheck     # TypeScript
- pnpm test:staged   # Tests for changed files
```

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with conventional commits
3. Run `pnpm ci:check` locally
4. Push branch and create PR
5. Verify GitHub Actions pass
6. Merge to `main` (squash or merge commit)
7. GitHub Actions auto-deploys to GitHub Pages

### Release Process
```bash
# 1. Ensure main is up to date
git checkout main && git pull

# 2. Run full test suite
pnpm ci:check

# 3. Generate changelog (optional)
pnpm changelog

# 4. Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Protected Files
Never commit these:
```gitignore
# Environment & secrets
.env
.env.local
*.pem
*.key

# PDFs (processed locally)
*.pdf

# IDE & OS
.DS_Store
.idea/
.vscode/settings.json

# Dependencies
node_modules/

# Build outputs (generated by CI)
dist/
.astro/
```

---

## GitHub Actions CI/CD

### Workflow: `ci.yml`
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Existing Schedule Data

### February 2026 - Pre-existing
| Week | Status | Notes |
|------|--------|-------|
| Feb 6 & 8 | **DONE** | Schedule already created manually |
| Feb 13 & 15 | Pending | Start auto-generation here |
| Feb 20 & 22 | Pending | |
| Feb 27 & Mar 1 | Pending | |

The scheduler will begin generating from **Feb 13 & 15, 2026** onwards.
