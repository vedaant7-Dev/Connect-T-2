# Nagarsevak Utility UI Change

## Requested behaviour

- The Nagarsevak Home dashboard no longer duplicates the Alerts & News composer because official updates are available from the dedicated News tab.
- Ward Utility Status no longer accepts or exposes a ward selector for Nagarsevaks.
- The backend derives the Nagarsevak ward from the authenticated user record.
- Utility timing uses cross-platform Start Time and End Time pickers.
- Schedule text and total hours are calculated automatically.
- A 24 Hours shortcut is available.

## Security boundary

Nagarsevak requests do not control `ward` or `wardCode`. The server continues to resolve and enforce the ward from the authenticated Nagarsevak database record. Super Admin behaviour remains unchanged.

## Verification

Regression tests verify that the duplicated Alerts & News panel is absent, the News tab remains, time pickers are used, and client-controlled ward fields are not submitted by the Nagarsevak dashboard.
