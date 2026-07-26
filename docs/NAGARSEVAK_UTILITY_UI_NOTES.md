# Implementation Notes

The Nagarsevak dashboard now treats utility posting as a role-scoped action rather than a ward-selection workflow. The mobile client sends utility details only; `backend/utilityStatusPatch.js` resolves the posting ward from the authenticated Nagarsevak user record.

The time range is stored using the existing `hoursPerDay` and `scheduleText` API fields, so no database migration is required for this UI change.
