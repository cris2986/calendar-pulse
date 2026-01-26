# Event Auditor PWA

## Overview

Event Auditor is a privacy-focused Progressive Web App that helps you identify commitments that haven't been scheduled in your calendar. Simply paste text containing dates and times, and the app will detect potential events, compare them against your calendar, and alert you about unscheduled commitments.

## Features

- **Local-First**: All data stored in IndexedDB, no backend required
- **Smart Date/Time Parser**: Detects Spanish dates and times (hoy, mañana, lunes, 15/02, etc.)
- **Calendar Integration**: Import ICS files to compare against your events
- **Leak Detection**: Identifies unscheduled commitments within 24-48 hours
- **Export to Calendar**: Download ICS files for any detected event
- **Web Notifications**: Get alerts for upcoming unscheduled commitments
- **Privacy by Design**: No passive reading of apps, only user-provided content

## Tech Stack

This project is built with:
- Vite
- TypeScript
- React Router v7
- React 19
- Tailwind v4
- Shadcn UI
- Lucide Icons
- Convex (backend & database)
- Convex Auth
- Framer Motion
- Three.js
- Bun (package manager)

## Getting Started

### Prerequisites

- Bun installed
- Convex account

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

### Environment Variables

Create a `.env.local` file with:

```
CONVEX_DEPLOYMENT=your-deployment
VITE_CONVEX_URL=your-convex-url
```

## Project Structure

```
src/
├── components/     # React components
│   └── ui/        # Shadcn UI components
├── pages/         # Page components
├── convex/        # Convex backend
├── hooks/         # Custom React hooks
└── lib/           # Utility functions
```

## Development Guidelines

See [VLY.md](./VLY.md) for detailed development conventions and best practices.

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run type-check` - Run TypeScript type checking
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run preview` - Preview production build
- `bun run test` - Run tests
- `bun run test:watch` - Run tests in watch mode

## Contributing

<!-- AI Agent: Add contribution guidelines if applicable -->

## License

<!-- AI Agent: Add license information -->

---

**Note for AI Agents:** This README should be updated to reflect the actual application being built. Keep it concise and user-focused. For detailed development conventions, refer to [VLY.md](./VLY.md).
