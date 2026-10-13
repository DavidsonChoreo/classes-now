# Building notes

Notes for anyone, person or agent, working on this app. The builder and Claude keep this file current. The rules in `AGENTS.md` come first when the two disagree.

## What this app does

A public page that shows which classes are meeting right now in each campus building, and what starts in the next 30 minutes. The visitor's browser reads the current term's sections from Davidson's public course API, so the page itself is static (GitHub Pages) but the schedule is live. It refreshes the clock every 30 seconds and reloads the schedule every 15 minutes.

## Running it locally

- `npm ci`: install (use this, not `npm install`, to keep the tested package set)
- `npm run dev`: run locally, then open the address it prints
- `npm test`: the schedule logic tests (Node's built-in test runner, no extra packages)
- `npm run lint` and `npm run typecheck`
- `npm run build`: the static site, in `.output/public`
- Add `?at=2026-10-14T10:00` to the address to see the page at another campus time.

## Conventions

- `app/utils/schedule.ts` holds all the schedule logic as plain functions with no Nuxt or browser APIs, so `tests/` can run it with Node. Keep it that way.
- `app/utils/academic-calendar.ts` holds each term's teaching dates, breaks, early endings and schedule swaps.
- `app/composables/useClassesNow.ts` does the fetching and timing. Nothing time-dependent renders until the page is in the browser, because the HTML is built ahead of time.
- Davidson colors and fonts live in `app/assets/css/brand.css`, which sets the layer's tokens to the brand guide's values. Text colors meet WCAG AAA: Davidson Red is only for borders, backgrounds and large bold text, and links use Lake Blue. Fonts (Libre Caslon Text, Inter) are self-hosted in `app/assets/fonts` under the SIL Open Font License, so the page makes no requests to Google.
- Busy buildings stay compact: `BuildingCard.vue` shows the first six sessions and folds the rest, and "starting soon", into `<details>` disclosures.
- Times are always campus time (America/New_York), whatever the visitor's own time zone.

## Things to know

- The API's `active` term is the one open for registration, not the one being taught. The app picks the term from the academic calendar by date and asks the API for it with `term_code`.
- The API has no breaks or holidays. Add each new academic year's terms to `academic-calendar.ts` before it starts, from the Registrar's published calendar.
- Fall Break 2026 is entered as Sept. 21–22, as read from the published calendar. Confirm it with the Registrar's page.
- The branding is pending College Communications approval (brand: branded in the passport). Review it with them before go-live.
- Meetings without a building or time ("TBA", independent studies) are left out. A course cross-listed under two codes shows once, with "also …".

## Data sources

- **Davidson course schedule API** (public, no sign-in): the app reads each section's meeting days, times, building and room for the current term, in the visitor's browser, to show what's meeting right now. Owner: Registrar's Office.
