# Rollback — 20260723 Complete Production Audit

This migration is additive. The safest rollback is to revert the application release while leaving the new nullable columns, receipt tables, indexes and broadcast tables in place. Older Connect-T code ignores them, so no destructive SQL rollback is required.

## Application rollback

1. Redeploy the previous known-good backend commit.
2. Rebuild/reinstall the previous mobile version if the client was released.
3. Confirm `/api/healthz`, unified login, complaints and existing alerts.
4. Leave the new database structures in place until the failed release is diagnosed.

## Data handling

- Do not delete `client_request_id` values: they protect against duplicate complaint submissions.
- Do not delete `alert_receipts` or `broadcast_receipts`: they contain delivery/read history.
- Do not drop broadcast rows if users have already received them.
- Existing alert rows retain their original content; the migration only backfills `language = 'en'`, `status = 'published'`, and `publish_at = created_at` where values were absent.

## Optional cleanup after a confirmed permanent rollback

Only after exporting a backup and confirming that no released client depends on the new routes may an administrator archive the new data. Dropping columns or tables is intentionally not automated because it would destroy audit history and could re-enable duplicate complaint creation.
