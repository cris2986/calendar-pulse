# Event Auditor PWA

## Overview
Event Auditor is a privacy-focused Progressive Web App (PWA) designed to help you identify commitments that haven't been scheduled in your calendar. It operates entirely locally on your device, parsing text to detect dates and times, and comparing them against your imported calendar events to find "leaks" (unscheduled commitments).

## Key Features
- **Local-First & Privacy-Centric**: All data is stored in IndexedDB within your browser. No data is sent to any server for processing.
- **Smart Parsing**: Deterministic parsing of Spanish date/time formats (e.g., "mañana a las 20:00", "el viernes", "15/02").
- **Leak Detection**: Automatically identifies events within a 24-48 hour window that are missing from your calendar.
- **Calendar Integration**: Import `.ics` files to sync your existing schedule.
- **Export Capability**: Generate and download `.ics` files for detected events to easily add them to your calendar.
- **Web Notifications**: Get alerted about imminent unscheduled commitments.

## Requirements
- A modern web browser (Chrome, Safari, Edge, Firefox).
- For mobile use: "Add to Home Screen" is recommended for the best experience.

## Development

### Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Shadcn UI.
- **Logic**: TypeScript, pure functions for core logic.
- **Database**: Dexie.js (IndexedDB wrapper).
- **Testing**: Vitest.

### Setup
1. Install dependencies:
   
