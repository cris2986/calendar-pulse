# QA Release Checklist

## 1. Preparation
- [ ] **Clean Slate**: Clear browser data (Application -> Clear site data).
- [ ] **Environment**: Verify running in Production mode (`bun run preview` or build).
- [ ] **Settings**: Verify default settings (Window: 48h, Retention: 30d).

## 2. Ingestion Scenarios
- [ ] **Paste Text (Date + Time)**: "Cena mañana a las 20:00".
  - Expected: Detected, High Confidence, Status: Pending/Leak.
- [ ] **Paste Text (Date only)**: "Entrega proyecto el viernes".
  - Expected: Detected, Medium Confidence, Status: Pending/Leak.
- [ ] **Paste Text (No Date)**: "Comprar leche".
  - Expected: Saved as Raw Record, No Event created.
- [ ] **Share Target**: (Mobile only) Share text from another app.
  - Expected: Input field populated.

## 3. Calendar Integration
- [ ] **Import ICS**: Upload a valid `.ics` file.
  - Expected: Events imported to `calendarEvents` table.
- [ ] **Matching (Exact)**: Paste text matching an existing calendar event exactly.
  - Expected: Status -> Covered.
- [ ] **Matching (Fuzzy)**: Paste text with same day + keywords overlap.
  - Expected: Status -> Covered.

## 4. State Machine
- [ ] **Leak Detection**: Event within 48h window, not in calendar.
  - Expected: Status -> Leak, Notification triggered (if permitted).
- [ ] **Pending**: Event outside 48h window.
  - Expected: Status -> Pending.
- [ ] **Expired**: Event in the past.
  - Expected: Status -> Expired.

## 5. Data Persistence
- [ ] **Reload**: Refresh page.
  - Expected: Events and Settings persist.
- [ ] **Autopurge**: Manually set an event date to > 30 days ago (via DB console) and reload.
  - Expected: Event removed.

## 6. UI/UX
- [ ] **Notifications**: Request permission, verify notification appears for Leak.
- [ ] **Download ICS**: Click download on an event.
  - Expected: `.ics` file downloaded with correct details.
- [ ] **Responsive**: Check layout on Mobile view (Chrome DevTools).

## 7. Final Verdict
- [ ] **Pass**: Ready for release.
- [ ] **Fail**: Critical bugs found (list below).
