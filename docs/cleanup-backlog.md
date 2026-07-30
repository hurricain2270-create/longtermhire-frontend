# LongTermHire — cleanup backlog

Rules for every item: one change per deploy, confirm the site works before the
next one. To roll back: Amplify → branch → last good deployment → **Redeploy
this version**, then ask for the commit to be reverted.

---

## Done

- [x] **B3 — dependencies pruned, 102 down to 13.** Five batches, a build
      confirmed between each. Every package removed is recorded with its exact
      version in `docs/removed-dependencies.md`; restoring one is a single
      `npm install`.
- [x] **B4 — `renderChunks` removed from `vite.config.ts`.** It forced every
      dependency into its own bundle, which the PWA plugin then precached —
      the reason a refresh never picked up a new build. Now one vendor chunk
      and Rollup's own splitting.
- [x] **Notifications.** Sixteen `ToastContainer` instances reduced to one at
      the app root, styled to match the cards. Note for anyone tempted to hide
      the progress bar in CSS: react-toastify closes a toast when that
      element's animation ends, so `display: none` leaves toasts on screen
      forever. Use the container's `hideProgressBar` prop.
- [x] **Emails.** All six templates in one plain style, no emoji, consistent
      subject casing: client invitation, team member invitation, both chat
      notifications, equipment request, first login.

- [x] **Error boundary.** One exception used to unmount the whole app and blank
      every page with nothing on screen to explain it. `App.tsx` now catches it,
      shows the error text, and keeps the rest of the app working. Added after a
      blank-screen episode where three rounds of guesswork got nowhere and the
      boundary found it in one.
- [x] **B11 (buttons half) — shared button styles.** `src/styles/buttons.ts`.
      Yellow primary, blue edit, green go, red danger, grey dismiss, in three
      sizes. All 53 labelled buttons use it. Type scale still outstanding.
- [x] **B15 (part) — backend routes in the repo.** `fault.js`, `contract.js`,
      `content.js`. The rest still live only on EC2.
- [x] **B2 — junk in `public/` removed.** 353 files, 6.7MB: AppImages zips and
      three unpacked copies, pwa-assets and favicon zips, template wireframes.
      Repo went from 665 files to 316. Commit `649b5745`.
- [x] **B1 — dead files removed.** `ClientDashboard copy.tsx`, two sample video
      files (35MB), `new.md`, `_redirects copy`. Commit `3bee9a4e`.

## Next up — zero risk

- [ ] **B14 — remove the dead `fault-upload` route from `fault.js`.** Nothing
      calls it now that faults use the shared upload path. Five minutes.

## Medium risk — do in batches with a build between each

- [ ] **B3 — prune `package.json`.** 102 dependencies declared, 12 imported.
      Remove in batches of ~15. Write `docs/removed-dependencies.md` listing
      every package and exact version so anything can be restored with one line.
      Biggest single win: builds get fast enough to trust.
      Stale ones worth killing regardless: `react-addons-update` (React 15-era,
      app is on 18), `bootstrap` (competing with Tailwind), `moment`
      (deprecated by its own maintainers), `@hotjar/browser` (script already
      removed).

- [ ] **B4 — drop `renderChunks` from `vite.config.ts`.** Currently emits one
      chunk per dependency; combined with `vite-plugin-pwa` that's the ~113
      precached files behind the stale-bundle problem. Do straight after B3.

- [ ] **B5 — fix `api.ts`.** Line 79 hard-sets `Content-Type: application/json`
      on the axios instance. Touches every API call, so it gets its own deploy.

## Low risk, mechanical

- [ ] **B6 — one API base URL.** Hardcoded in seven places: `ClientDashboard.tsx`,
      `ClientHires.tsx`, `ClientSite.tsx`, `Faults.tsx`, `ClientFaults.tsx`,
      `api.ts`. No way to point at a staging backend without editing six files.

- [ ] **B7 — strip debug logging.** 253 `console.log` / `warn` / `error` calls,
      many with emoji prefixes. Leaks internal state on a public site.

- [ ] **B11 — define shared type and button styles.** No shared sizes, so every page picks
      its own pixel values — which is why the newer admin pages drifted one
      notch smaller than the older ones and had to be corrected by hand
      (`04a7cc88`). Define the sizes once in `tailwind.config` and reference
      them so it can't drift again.

      Same problem with buttons: Contract Set Up and Equipment Management use
      pill buttons, Content Management uses text links, Quote Management neither.
      Client Management was converted to pills (`bb086ddd`) because there was no
      majority to follow. Define primary / secondary / danger once and reference
      them, rather than pasting Tailwind strings per page.

- [ ] **B15 — get the remaining backend route files into `backend-routes/`.**
      `fault.js` and `contract.js` are there; the rest live only on EC2, which
      means any change to them is guesswork from a 45-line grep window. Having
      `contract.js` in the repo is the only reason the contract delete took
      minutes instead of a new endpoint — the delete, the status field and the
      draft-only policy were already written and had simply never been called.
      Upload the rest with the same one-liner, then every backend change becomes
      read → patch → one curl → `pm2 restart`.

- [ ] **B12 — one upload path.** Two exist: `equipmentApi.uploadFile` (6 call
      sites, proven) and `uploadUtils.uploadImage` → `sdk.upload` (3 older
      screens). Standardise on the first.

- [ ] **B13 — de-duplicate the chat hooks.** `useChat` and `useClientChat` are
      the same code twice. A bug fixed in one silently persists in the other —
      exactly what happened with the polling gate.

## Settings — do when nothing else is in flight

- [ ] **B8 — make the repo private, and add `.env*` to `.gitignore`.** No
      credentials are committed today (only a dummy in
      `src/test/utils/fixtures/user.fixture.ts`), but there's no reason for the
      frontend to be public, and nothing currently stops a future `.env` being
      committed.

- [ ] **B9 — commit `amplify.yml`.** Build config lives only in the console:
      invisible, unversioned, unrecoverable if the app is deleted.

## Real refactoring — its own sessions, site stable

- [ ] **B10 — split the oversized files and turn TypeScript back on.**
      `ClientDashboard.tsx` 2,633 lines · `Chat.tsx` 1,317 · `CompanyDetails.tsx`
      1,113 · `ClientManagement.tsx` 838. And 52 of 97 source files start with
      `@ts-nocheck`, so type checking is effectively off across most of the app.

---

## Client portal permissions

Built: `permissions` column on `longtermhire_company_member`, tick boxes when
onboarding a member, and gating for the five areas (plant tiles, term
calculator, current hires, faults, machines on hire). Role is a preset that
fills the boxes; the boxes decide. Ticker, sticky note, chat and profile are
always on.

- [ ] **Enforce permissions on the endpoints.** Gating is currently in the
      browser only. Someone technical could open DevTools, take their own
      token and call the fault or hire endpoints directly. Judged an acceptable
      risk for now: the users are site supervisors and company owners, and the
      exposure is fault records for machines they already hire.
      **Revisit before putting anything commercially sensitive behind a tick
      box** — other companies' rates, invoices, contracts. At that point
      "they'd have to try" stops being a defence.
- [ ] **Editing permissions after onboarding.** The tick boxes appear when
      adding a member. Changing an existing member's role rewrites their
      permissions to that role's preset, but there's no screen to adjust the
      boxes on their own.
- [ ] Permissions are read at login, so changes need a log out and back in
      before they take effect.

## Dashboard

- [ ] **The turnover dial pegs above 120%.** Seen live reading "252% past your
      best" with the needle at the far end. Anything from 121% upward looks
      identical. Decide whether the needle pegs and the caption carries the
      number, or the scale follows an exceptional month. Pegging is probably
      right — a dial that rescales is hard to read at a glance.
- [ ] **"252% past your best" reads oddly.** Arithmetically correct. Something
      like "3.5x your best month" says the same thing more plainly once past
      roughly 150%.
- [ ] **The figure sits over the arc.** $24,012 fits at five characters; six
      will collide with the coloured band. Shrink it or drop it lower.
- [ ] **Fleet count.** The dial says 6 of 18 while the fleet was 19 machines.
      Either one was deleted or something is being excluded from the count —
      worth checking which before the number is trusted.

## Client portal

- [ ] **Time gaps in the client fault thread.** The admin thread shows "3 hours
      later" dividers between messages; the client thread does not. Larry is the
      one waiting on a reply, so the gaps arguably matter more on his side.
      `ClientFaults.tsx`, mirroring the `hrs()` / `human()` helpers in
      `Faults.tsx`.
- [ ] **Fault resolution notes.** When a fault is closed, record what it turned
      out to be and what fixed it. Not a form — a sentence. Nothing depends on
      it today, but it is what any future troubleshooting assistant would learn
      from, and it costs nothing to start collecting now.

## From the Equipment / Content merge

- [ ] **Retire Content Management properly.** Now greyed and last in the menu
      (`a1b81428`) pending a month or two of using the merged Equipment
      Management. To remove: the menu entry, the route in `App.tsx`, and
      `ContentManagement.tsx`.
- [ ] **Category on the content list query.** `content.js` joins the equipment
      table but selects no category, so the merged page derives categories from
      the equipment list instead. Also worth tidying the duplicated
      `c.updated_at` and `e.equipment_id` columns in that SELECT.

## Open question

- Fault thread scrolling: fixed-height window with its own scrollbar like the
  chat, or keep it expanding down the page?

## Not cleanup, but outstanding

- [ ] Revoke the GitHub personal access token used during these sessions.
- [ ] Terminate the 15 stopped EC2 instances dated 21/7/2026 onward — still
      billing for disk. Leave the 13/8/2025 instance (`16.170.248.93`) alone.
- [ ] Disk on EC2 at 79% of 6.8GB. Not urgent. To find the space:
      `sudo du -xh / 2>/dev/null | sort -rh | head -20`
