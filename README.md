# Brio Cart web app and Android app

React 19 + Vite 8 + Tailwind 4 storefront and admin dashboard, packaged for Android with Capacitor 8.
Standalone: it talks to a separately running Brio Cart API (the `brio-cart-backend` project).
Requires **Node.js 22+** and npm 10+.

## Setup and run

```bash
npm install
npm run dev      # http://localhost:5847
```

In development Vite proxies `/api` and `/uploads` to the API at `BRIO_API_PROXY`
(default `http://localhost:4847`):

```bash
BRIO_API_PROXY=http://localhost:4847 npm run dev
```

## API URL

`VITE_API_URL` (in `.env`, see `.env.example`) sets the API origin at build time. Leave it empty to call
`/api` on the same origin (Vite proxy in dev, or a reverse proxy in production). Set it, e.g.
`VITE_API_URL=https://api.example.in`, when the API is hosted on another domain; the API then needs that
web origin in `CORS_ORIGINS` and `PUBLIC_BASE_URL` set.

## Roles

After sign-in, staff (admin and super admin) go to `/admin`, riders to `/rider` and customers to `/`.
Routes are guarded in `src/auth/guards.tsx` and `src/auth/access.ts`, and the admin menu is filtered with the
shared permission map (`src/shared/permissions.ts`). The API enforces the same rules. Riders sign up at
`/rider/register` and use the rider pages from their phone's browser. Every role has a notification bell,
polled every 30 seconds.

## Build, test, lint

```bash
npm run build       # type-check + production build to dist/
npm run preview     # serve dist/ on port 5848 (same /api proxy)
npm run typecheck
npm test            # Vitest (components, cart store, route guards, shared pricing/WhatsApp tests)
npm run lint
```

End-to-end tests (Playwright, Google Chrome) start their own isolated API from a backend checkout:

```bash
BRIO_BACKEND_DIR=/path/to/brio-cart-backend npm run test:e2e
```

## Android app

`android/` is the Capacitor project; `capacitor.config.ts` uses `dist/` as the web directory.
Native builds read `VITE_API_URL` from `.env.native` (see `.env.native.example`). Capacitor 8 needs JDK 21 and the Android SDK.

```bash
npm run cap:sync          # native web build + cap sync android
npm run android:debug     # → artifacts/android/brio-cart-debug.apk
BRIO_API_URL=https://api.example.in npm run android:release
npm run assets:generate   # regenerate icons/splash from assets/
```

## Shared code

`src/shared/` (pricing, money, WhatsApp, domain constants, zod schemas) is imported as `@shared`. It is a copy of the same folder in the backend project; keep the two identical when changing it. Its tests live in `test/shared/`.

See `docs/VERIFICATION.md` for the original verification log (written for the combined repository).
