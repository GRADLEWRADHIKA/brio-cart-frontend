# Verification log

Commands actually run while building this project (Windows 11, Node 24.13, JDK 21 JBR, Android SDK 36), 14 Oct 2026.

| Check | Command | Result |
| --- | --- | --- |
| Shared unit tests (pricing, coupons, WhatsApp link/message, validation) | `npm test -w shared` | **19/19 passed** |
| Backend API integration tests (catalogue, search, cart validation, orders, idempotency, areas, inventory, auth, admin authorization, admin CRUD, status transitions, uploads, riders, OTP delivery + lockout, live GPS tracking, ratings, coupons + usage limits, demo-mode gating) | `npm test -w backend` | **39/39 passed** |
| Frontend unit/component tests (cart store, persistence, ProductCard, utils) | `npm test -w frontend` | **13/13 passed** |
| Type checks | `npm run typecheck` | **passed** (shared, backend, frontend) |
| Lint | `npm run lint` | **passed** |
| Frontend production build | `npm run build -w frontend` / `build:native` | **passed**; initial load ≈ 155 kB gzip (zod/forms code-split to form pages) |
| Backend production bundle + smoke test | `npx tsup` then `node dist/server.js` (`/api/health`, `/api/products`) | **passed** |
| Capacitor sync | `npx cap sync android` | **passed**, 7 native plugins linked |
| Debug APK | `npm run android:debug` | **BUILD SUCCESSFUL** → `artifacts/android/brio-cart-debug.apk` (8.06 MB), package `com.thegradlew.briocart`, targetSdk 36 |
| Release APK + AAB | `BRIO_API_URL=https://briocartb.thegradlew.info npm run android:release` | **BUILD SUCCESSFUL** → `brio-cart-release.apk` (7.18 MB, rebuilt with the rider/tracking/payment-demo features; APK Signature Scheme v2 verified with the Brio Cart upload key, not debuggable, cleartext/mixed content/WebView debugging disabled) and `brio-cart-release.aab` (7.04 MB) |
| Playwright E2E (desktop + mobile, real UI + isolated API) | `npm run test:e2e` | Last full run: **10 passed, 3 failed**. All 3 failures were ambiguous test selectors (closed cart drawer duplicating cart lines; “14% OFF” vs “14% off”), not app defects. The selectors were fixed afterwards; **the suite has not been re-run since that fix.** Passing journeys included homepage, category browse + search + product detail, out-of-stock handling, WhatsApp link composition (no order created), checkout validation + real order placement with double-tap protection, customer blocked from admin (UI and API 403), admin order-status update visible to customer, delivery-area enforcement. |

## Advanced features — manual walkthrough (14 Oct 2026, local dev servers, in-app browser)

Turned on demo mode in Admin → Settings, then: added ₹301 of produce → applied coupon `FRESH50` (−₹50) at checkout → chose Pay Online (Demo) → demo card payment with the test card → redirected to order page showing *Paid (demo payment — no money charged)* and the delivery code → admin assigned rider and ran *Run demo delivery* → customer page showed the live map with moving rider, ETA, rider card and *Demo simulation* badge → signed in as the rider at `/rider` (mobile viewport), entered the customer’s code on the keypad → order Delivered → customer rated 5★ and used *Order again* → Admin → Live operations map showed a second demo trip. Real phone GPS sharing was covered by the API tests, not by a physical device.

## Public links (14 Oct 2026)

Verified over HTTPS through Cloudflare:

- https://briocartf.thegradlew.info serves the production build (200; deep links like /shop return 200).
- The website’s `/api` proxy, product images, and cookie sign-in (`/api/auth/login` then `/api/auth/me`) work.
- https://briocartb.thegradlew.info/api/health returns 200, and CORS allows `https://localhost` (the Android app) but not other origins.

## Not verified

- The APKs were **not installed or launched on a device or emulator** (emulator testing was skipped at the owner’s request).
- The release APK calls https://briocartb.thegradlew.info (verified live: health, store data, images, CORS for the app origin), but the app itself was not launched on a device.
- PostgreSQL migration path (no PostgreSQL server available).
- Lighthouse audit was not run.
