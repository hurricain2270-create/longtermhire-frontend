# LongTermHire — cleanup backlog

Rules for every item: one change per deploy, confirm the site works before the
next one. To roll back: Amplify → branch → last good deployment → **Redeploy
this version**, then ask for the commit to be reverted.

---

## Done

- [x] **B1 — dead files removed.** `ClientDashboard copy.tsx`, two sample video
      files (35MB), `new.md`, `_redirects copy`. Commit `3bee9a4e`.

## Next up — zero risk

- [ ] **B2 — junk in `public/`.** `AppImages.zip` / `(1)` / `(2)` plus both
      unpacked `AppImages/` directories, two `pwa-assets` zips, three `favicon`
      zips, and the previous developer's wireframe PNGs
      (`dashboard-wireframe.png`, `Wireframes-API-1/2.png`,
      `baas-features-drawer.png`, `scannerview.png`). ~3MB, all verified
      unreferenced.

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

- [ ] **B6 — one API base URL.** Hardcoded in six files: `ClientDashboard.tsx`,
      `ClientHires.tsx`, `ClientSite.tsx`, `Faults.tsx`, `ClientFaults.tsx`,
      `api.ts`. No way to point at a staging backend without editing six files.

- [ ] **B7 — strip debug logging.** 247 `console.log` / `warn` / `error` calls,
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

- [ ] **B14 — remove the dead `fault-upload` backend route.** Nothing calls it
      now that faults use the shared upload path.

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

## Open question

- Fault thread scrolling: fixed-height window with its own scrollbar like the
  chat, or keep it expanding down the page?

## Not cleanup, but outstanding

- [ ] Revoke the GitHub personal access token used during these sessions.
- [ ] Terminate the 15 stopped EC2 instances dated 21/7/2026 onward — still
      billing for disk. Leave the 13/8/2025 instance (`16.170.248.93`) alone.
- [ ] Disk on EC2 at 79% of 6.8GB. Not urgent. To find the space:
      `sudo du -xh / 2>/dev/null | sort -rh | head -20`
