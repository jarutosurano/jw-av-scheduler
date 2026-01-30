# JW AV Scheduler

Automated Audio/Video scheduling system for congregation meetings. Generates fair rotation assignments from Hourglass PDF exports with privilege-based constraints and availability checking.

[![Deploy to GitHub Pages](https://github.com/jarutosurano/jw-av-scheduler/actions/workflows/deploy.yml/badge.svg)](https://github.com/jarutosurano/jw-av-scheduler/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Live Demo

**[View Live Site](https://jarutosurano.github.io/jw-av-scheduler/)**

## Features

- **Fair Rotation** - Brothers are assigned based on how recently they served, ensuring equitable distribution
- **Availability Checking** - Automatically excludes brothers who have speaking assignments by parsing Hourglass PDFs
- **Privilege-Based Restrictions** - Certain positions (Audio, Video) are restricted to qualified brothers
- **Same Team Policy** - The same team serves both midweek and weekend meetings for consistency
- **Special Week Handling** - Support for Memorial, Circuit Assembly, and other special events
- **Dark/Light/System Theme** - User preference-based theme switching
- **Mobile Responsive** - Works on all device sizes with hamburger menu navigation
- **Print Friendly** - Optimized print styles for physical schedules

## Tech Stack

- **Framework:** [Astro](https://astro.build/) - Static site generator
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- **Language:** [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **PDF Parsing:** [pdf-parse](https://www.npmjs.com/package/pdf-parse) - Extract text from PDFs
- **Testing:** [Vitest](https://vitest.dev/) - Unit testing framework
- **Deployment:** [GitHub Pages](https://pages.github.com/) - Static hosting

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/jarutosurano/jw-av-scheduler.git

# Navigate to project directory
cd jw-av-scheduler

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Usage

### Generating Schedules

1. **Export PDFs from Hourglass** - Download the midweek and weekend meeting schedules as PDF files

2. **Run the generator:**

```bash
pnpm generate --pdf midweek.pdf --pdf weekend.pdf --month 2026-05
```

3. **Preview locally** (optional):

```bash
pnpm dev
```

4. **Deploy** - Commit and push to trigger GitHub Pages deployment:

```bash
git add .
git commit -m "Add May 2026 schedule"
git push
```

### CLI Options

| Option            | Description                                     | Example                               |
| ----------------- | ----------------------------------------------- | ------------------------------------- |
| `--pdf`           | Path to Hourglass PDF files (required, 2 files) | `--pdf midweek.pdf --pdf weekend.pdf` |
| `--month`         | Target month in YYYY-MM format (required)       | `--month 2026-05`                     |
| `--note`          | Add note to a week                              | `--note 2026-04-03:Memorial`          |
| `--weekend-only`  | Mark week as weekend-only (no midweek)          | `--weekend-only 2026-04-03`           |
| `--no-meeting`    | Mark week with no meetings                      | `--no-meeting 2026-04-10`             |
| `--add-week`      | Manually add a week                             | `--add-week 2026-04-03:2026-04-05`    |
| `--preview`       | Preview without saving files                    | `--preview`                           |
| `--clear-history` | Clear history for the month                     | `--clear-history`                     |
| `--cleanup`       | Delete PDFs after generation                    | `--cleanup`                           |

### Example: April with Memorial and Circuit Assembly

```bash
pnpm generate --pdf midweek.pdf --pdf weekend.pdf --month 2026-04 \
  --add-week 2026-04-03:2026-04-05 \
  --note 2026-04-03:Memorial \
  --weekend-only 2026-04-03 \
  --add-week 2026-04-10:2026-04-12 \
  --note "2026-04-10:Circuit Assembly" \
  --no-meeting 2026-04-10
```

## Project Structure

```
jw-av-scheduler/
├── data/
│   ├── brothers.json      # Brother profiles and restrictions
│   └── history.json       # Assignment history for rotation
├── schedules/             # Generated schedule JSON files
├── src/
│   ├── cli/               # CLI tools
│   │   └── generate.ts    # Schedule generator CLI
│   ├── components/        # Astro components
│   │   ├── ScheduleTable.astro
│   │   ├── Sidebar.astro
│   │   └── ThemeToggle.astro
│   ├── config/
│   │   ├── brothers.ts    # Brother data loader
│   │   └── constraints.ts # Position eligibility rules
│   ├── layouts/
│   │   └── Layout.astro   # Main layout with theming
│   ├── lib/
│   │   └── schedules.ts   # Schedule utilities
│   ├── pages/
│   │   ├── index.astro    # Dashboard
│   │   └── schedule/[month].astro
│   ├── parser/            # PDF parsing
│   │   ├── midweek-parser.ts
│   │   ├── weekend-parser.ts
│   │   └── pdf-extractor.ts
│   ├── scheduler/         # Scheduling engine
│   │   ├── engine.ts      # Core scheduling algorithm
│   │   ├── generator.ts   # Schedule generator
│   │   ├── history.ts     # Assignment history tracking
│   │   └── availability.ts
│   └── types/
│       └── index.ts       # TypeScript definitions
├── public/                # Static assets
├── astro.config.mjs       # Astro configuration
└── package.json
```

## AV Positions

| Category        | Positions                                       |
| --------------- | ----------------------------------------------- |
| **Booth**       | Audio, Video, A/V Assistant                     |
| **Microphones** | Right Mic, Left Mic                             |
| **Attendants**  | Front/Stage, Auditorium, Entrance 1, Entrance 2 |

## Configuration

### Adding/Editing Brothers

Edit `data/brothers.json`:

```json
{
  "id": "john-doe",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "privilege": "ministerial_servant",
  "restrictions": [],
  "active": true
}
```

### Privilege Levels

- `elder` - Can serve in all positions
- `ministerial_servant` - Can serve in all positions
- `publisher` - Limited to mic and attendant positions
- `unbaptized` - Limited to attendant positions only

### Restrictions

- `no_audio` - Cannot operate audio
- `no_video` - Cannot operate video
- `no_mic` - Cannot handle microphones
- `no_entrance` - Cannot serve at entrances
- `mic_once_monthly` - Mic duty limited to once per month

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for Victoria Tagalog Congregation, Kitchener, ON
- Inspired by the need for fair and efficient AV scheduling
