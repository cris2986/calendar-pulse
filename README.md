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
- **Data Management**: Export/import your data as JSON backups, or reset all data when needed.
- **Quick Capture**: "Paste and Process" button for instant clipboard processing.
- **Web Share Target**: Share text from other apps directly into Event Auditor (mobile).
- **Debug Mode**: Advanced diagnostics for troubleshooting (toggle with 🐛 button or `?debug=true` URL parameter).

## Requirements
- A modern web browser (Chrome, Safari, Edge, Firefox).
- For mobile use: "Add to Home Screen" is recommended for the best experience.

## Quick Start

### Installation
1. Visit the application URL in your browser
2. On mobile: Tap "Add to Home Screen" from your browser menu
3. On desktop: Look for the install prompt or use browser's PWA install option

### Basic Usage
1. **Add a commitment**: Paste or type text with date/time (e.g., "mañana 19:00 dentista")
2. **Import calendar**: Upload your `.ics` calendar file to enable leak detection
3. **Review leaks**: Check the inbox for unscheduled commitments
4. **Take action**: Mark as covered, discard, or download as ICS to add to your calendar

### Advanced Features
- **Paste and Process**: Click the "📋 Pegar y Procesar" button to instantly process clipboard content
- **Share from other apps**: Use your device's share menu to send text to Event Auditor
- **Data backup**: Use the 💾 icon to export/import your data or reset everything
- **Debug mode**: Enable with the 🐛 button to see all events and database statistics

## Development

### Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Shadcn UI.
- **Logic**: TypeScript, pure functions for core logic.
- **Database**: Dexie.js (IndexedDB wrapper).
- **Testing**: Vitest.

### Setup
1. Install dependencies:
   

