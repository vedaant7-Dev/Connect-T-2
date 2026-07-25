# Broadcast media deployment on Render

## Why “The requested service is unavailable” appears

That exact Connect-T message is returned with `code: ROUTE_NOT_FOUND`. It means the web app reached a backend that does not currently expose `/api/broadcasts`. It is not caused by the broadcast title, message, audience or schedule.

Common causes:

1. `connect-t-web-testing` points to an older or different backend URL.
2. The `connect-t-2` backend has not redeployed the latest `main` commit.
3. The backend deploy failed and Render kept the previous successful version.
4. The static site was deployed before the backend and retained an older API URL at build time.

## Correct deployment order

1. Merge the broadcast media pull request.
2. Deploy the Render web service `connect-t-2` from the latest `main` commit.
3. Confirm the deploy logs contain:

   ```text
   [BroadcastMediaPatch] broadcast media and route diagnostics active
   ```

4. Open:

   ```text
   https://<backend-host>/api/broadcasts/capabilities
   ```

5. Confirm the response contains:

   ```json
   {
     "success": true,
     "routeVersion": "broadcast-media-v1"
   }
   ```

6. Confirm an unauthenticated request to `/api/broadcasts` returns HTTP 401 rather than 404.
7. Deploy `connect-t-web-testing` only after the backend verification passes.
8. Hard refresh the browser with Ctrl + Shift + R.

## Supported attachments

- One optional image: JPEG, PNG or WebP, maximum 10MB.
- One optional video: MP4 or MOV, maximum 5 minutes and 50MB.
- The backend verifies the real file signature.
- The backend reads the MP4/MOV movie header and rejects videos longer than five minutes.
- The backend authenticates the publisher before processing the large file.
- Duplicate request IDs are bound to the original publisher.
- Failed database writes remove newly stored media.

## Database migration

The backend can add missing media columns automatically. For controlled production deployment, run:

```text
backend/migrations/20260725_broadcast_media.sql
```

Take a database backup before running any migration.

## Render file persistence

Render web services use an ephemeral filesystem by default. On a free service, uploaded files can disappear when the service restarts, redeploys or spins down.

For lasting production media, use one of these approaches:

1. Attach a paid Render persistent disk and set `UPLOAD_DIR` to its mount path.
2. Use external object storage and store only the resulting media URL in MySQL.

The current local upload path is appropriate for immediate workflow testing, but it must not be treated as durable production storage on a free Render instance.
