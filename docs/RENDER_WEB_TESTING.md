# Connect-T Expo Web Testing on Render

This deployment publishes the **actual Expo/React Native Connect-T application** from the `mobile` folder as a Render Static Site. It is intended for fast browser testing of Civic and Job Portal workflows before producing a new APK.

## Render service

The root `render.yaml` keeps the existing Node backend service and adds:

- Service name: `connect-t-web-testing`
- Type: Render Static Site
- Root directory: `mobile`
- Build command: `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund && npm run export:web`
- Publish directory: `dist`
- API URL: `https://newapp.e-bjp.in`
- SPA rewrite: `/*` to `/index.html`
- Automatic deploy: after GitHub checks pass
- Pull-request previews: enabled
- Search indexing: disabled with `X-Robots-Tag`

## First Render setup

1. Sign in to Render and connect the GitHub repository `vedaant7-Dev/Connect-T-2`.
2. Choose **New > Blueprint**.
3. Select this repository and confirm the root `render.yaml`.
4. Review the two services. Keep the existing backend service unchanged and create the new `connect-t-web-testing` static site.
5. After the first deployment, copy the generated `https://<service>.onrender.com` URL.
6. If the deployed backend uses a non-empty `ALLOWED_ORIGINS` environment variable, append the exact Render web origin to that comma-separated value and restart the backend.

## What can be tested quickly in the browser

- Unified login and OTP API responses
- Citizen, Nagarsevak and Super Admin role routing
- Job Seeker and Employer onboarding and dashboards
- Civic to Job Portal switching and logout
- Text-only and browser file-picker complaint submission
- News, alerts, broadcasts and read state
- Profile editing and read-only verified mobile number
- English, Marathi and Hindi UI
- General responsive layout, navigation and form validation

## Browser limitations

Browser testing is useful for rapid workflow checks but does not replace native-device testing:

- SMS autofill behaves differently from Android/iOS.
- Camera and gallery permission UX is browser-controlled.
- Native SecureStore uses browser storage on web.
- Android keyboard overlay, back button, notification channels, haptics and native deep-link behaviour must still be tested in an APK.
- External push notifications are not enabled.

## Update workflow

After this service is created, every successful commit to the linked branch can redeploy automatically. For safer testing, use Render pull-request previews for new fixes and merge only after the preview works.

## API and CORS check

The frontend compiles `EXPO_PUBLIC_API_URL` at build time. The current value is:

```text
https://newapp.e-bjp.in
```

The backend allows any origin when `ALLOWED_ORIGINS` is empty. When `ALLOWED_ORIGINS` contains values, the exact Render origin must be included or browser requests will be blocked by CORS.
