# QA Release Checklist

## 1. Preparation
- [ ] **Clean Slate**: Clear browser data (Application -> Clear site data).
- [ ] **Environment**: Verify running in Production mode (`bun run preview` or build).
- [ ] **Settings**: Verify default settings (Window: 48h, Retention: 30d).
- [ ] **Version**: Confirm version number in package.json and README.md match.

## 2. Ingestion Scenarios
- [ ] **Paste Text (Date + Time)**: "Cena mañana a las 20:00".
  - Expected: Detected, High Confidence, Status: Pending/Leak.
- [ ] **Paste Text (Date only)**: "Entrega proyecto el viernes".
  - Expected: Detected, Medium Confidence, Status: Pending/Leak.
- [ ] **Paste Text (No Date)**: "Comprar leche".
  - Expected: Saved as Raw Record, No Event created.
- [ ] **Paste and Process**: Click "📋 Pegar y Procesar" button.
  - Expected: Clipboard content processed automatically.
- [ ] **Share Target**: (Mobile only) Share text from another app.
  - Expected: Input field populated, text processed.

## 3. Calendar Integration
- [ ] **Import ICS**: Upload a valid `.ics` file.
  - Expected: Events imported to `calendarEvents` table.
- [ ] **View Calendar**: Open calendar modal (📅).
  - Expected: All imported events displayed.
- [ ] **Clear Calendar**: Click "Borrar todo" in calendar modal.
  - Expected: All calendar events removed, confirmation required.
- [ ] **Matching (Exact)**: Paste text matching an existing calendar event exactly.
  - Expected: Status -> Covered.
- [ ] **Matching (Fuzzy)**: Paste text with same day + keywords overlap.
  - Expected: Status -> Covered.
- [ ] **Download ICS**: Click "Descargar ICS" on an event.
  - Expected: `.ics` file downloaded with correct details.

## 4. State Machine
- [ ] **Leak Detection**: Event within 48h window, not in calendar.
  - Expected: Status -> Leak, Notification triggered (if permitted).
- [ ] **Pending**: Event outside 48h window.
  - Expected: Status -> Pending.
- [ ] **Expired**: Event in the past.
  - Expected: Status -> Expired.
- [ ] **Manual Actions**: Mark as covered, discard.
  - Expected: Status updated accordingly.

## 5. Data Persistence & Management
- [ ] **Reload**: Refresh page.
  - Expected: Events and Settings persist.
- [ ] **Autopurge**: Manually set an event date to > 30 days ago (via DB console) and reload.
  - Expected: Event removed.
- [ ] **Export Data**: Click "📥 Exportar a JSON" in data management modal (💾).
  - Expected: JSON file downloaded with all data.
- [ ] **Import Data**: Upload previously exported JSON file.
  - Expected: All data restored correctly.
- [ ] **Reset Data**: Click "🗑️ Resetear todos los datos".
  - Expected: All data cleared after confirmation.

## 6. Debug Mode
- [ ] **Enable Debug**: Click 🐛 button or add `?debug=true` to URL.
  - Expected: Debug mode indicator appears, all events shown.
- [ ] **Debug Stats**: Verify "DB Count" and "Last Status" display correctly.
  - Expected: Accurate statistics shown.
- [ ] **Disable Debug**: Click 🐛 button again.
  - Expected: Return to normal view (leaks + pending only).

## 7. UI/UX
- [ ] **Notifications**: Request permission, verify notification appears for Leak.
- [ ] **Responsive**: Check layout on Mobile view (Chrome DevTools).
  - Expected: All elements accessible and properly sized.
- [ ] **Settings Modal**: Open settings (⚙️), change values.
  - Expected: Settings saved and applied.
- [ ] **Modals**: Test all modals (Settings, Calendar, Data Management).
  - Expected: Open/close smoothly, backdrop click closes modal.
- [ ] **Toast Notifications**: Verify toast messages for all actions.
  - Expected: Clear feedback for success/error states.

## 8. Performance
- [ ] **Initial Load**: Measure time to interactive.
  - Expected: < 3 seconds on 3G connection.
- [ ] **Large Dataset**: Import 100+ calendar events, add 50+ commitments.
  - Expected: No lag, smooth scrolling.
- [ ] **Memory**: Check for memory leaks (Chrome DevTools Performance).
  - Expected: Stable memory usage over time.

## 9. Browser Compatibility
- [ ] **Chrome/Edge**: Full functionality test.
- [ ] **Safari (Desktop)**: Full functionality test.
- [ ] **Safari (iOS)**: Full functionality test, PWA install.
- [ ] **Firefox**: Full functionality test.

## 10. PWA Features
- [ ] **Install Prompt**: Verify PWA install prompt appears.
- [ ] **Offline**: Test basic functionality without network.
  - Expected: App loads, local data accessible.
- [ ] **Add to Home Screen**: (Mobile) Install PWA.
  - Expected: App icon on home screen, standalone mode.

## 11. Regression Tests
- [ ] **Run Test Suite**: Execute `bun test`.
  - Expected: All tests pass (0 failures).
- [ ] **Core Logic**: Verify parseDateTimeES, matcher, stateMachine tests.
  - Expected: 100% pass rate.

## 12. Security & Privacy
- [ ] **No Network Calls**: Verify no unexpected network requests (DevTools Network tab).
  - Expected: Only local storage operations.
- [ ] **Data Isolation**: Verify data stays in IndexedDB.
  - Expected: No data sent to external servers.
- [ ] **XSS Protection**: Test with malicious input (e.g., `<script>alert('xss')</script>`).
  - Expected: Input sanitized, no script execution.

## 13. Documentation
- [ ] **README**: Verify README.md is up-to-date with all features.
- [ ] **Version**: Confirm version number in package.json.
- [ ] **Changelog**: Update CHANGELOG.md with release notes (if exists).

## 14. Final Verdict
- [ ] **Pass**: Ready for beta release.
- [ ] **Fail**: Critical bugs found (list below).

---

## Critical Bugs Found
(List any blocking issues discovered during QA)

---

## Notes
(Add any additional observations or recommendations)

---

**QA Performed By**: _____________  
**Date**: _____________  
**Version Tested**: _____________  
**Environment**: _____________