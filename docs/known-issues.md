# Known issues

Compiled 14 Aug 2026. Split by how certain we are.

---

## Confirmed this session, now fixed

- **Dashboard, faults, chat, company-logo all 404.** The running PM2 process
  predated the code on disk. A restart fixed it. Nothing wrong with the code.
- **`role_id = 'member'` in ten places.** Clients carry `'client'`. Every one of
  those queries matched nothing. Six in `chat.js` (clients list, chat client
  lookup, dashboard client count, unread messages, online users, single client
  fetch) and four in `clientpassword.js`. Fixed and pushed.
- **Forgot password.** Not missing, as the handover said - fully built and one
  wrong string from working. Proven end to end with curl. Four routes exist:
  forgot-password, verify-otp, reset-password, resend-otp.
- **`clientpassword.js` existed only on the EC2 box.** Never pushed. Now in
  `backend-routes/`.
- **Seed availability drifted from actual hires.** Hardcoded list of 13 plant
  codes vs a random hire-status draw. Now derived. Fixed and pushed.
- **Stray root-owned `FILE.js`** in the routes directory, from the pull command
  template being run verbatim. Deleted.

---

## Confirmed, still open

- **"Total Companies" tile reads 0 and is right but misleading.** It counts
  `longtermhire_company`, which is genuinely empty - that table is the
  multi-user parent, not clients. Sat next to a gauge saying 12 clients it
  reads as broken. Rename or repoint. Frontend change.
- **Password reset UPDATE does not check affected rows.** With the role fixed
  it works, but if it ever matches nothing again it will still return
  "Password reset successfully". Needs the return shape of `sdk.rawQuery`
  checked before hardening - do not guess at it.
- **Turnover disagrees between the dashboard dial and Reporting.** Parked.
  Dial showed $30,635 for Aug against $31,086 best in Jul, which looks wrong
  for ten flat monthly hires. Needs both screens open.
- **`xclip`/`xsel` errors flooding the PM2 error log.** Harmless, but they
  buried the real error today and cost time.
- **PM2 restart count at 139.** Worth knowing why it has restarted so often.

---

## From the handover, not yet touched

- Passwords still emailed in plain text, two places.
- **Permissions enforced browser-side only, not on the API.** Now that real
  client logins exist this is the most serious one on the list.
- Login logging agreed as the way to spot a shared account. Not built.
- 12 of 18 machines have no service schedule, none have information sheets.
- 336 console statements; API address hardcoded in seven places.
- Voiceover audio files not generated.

---

## Not yet verified - first job tomorrow

- **Does a client actually see only their assigned machines?**
  Bradley (`test1@example.invalid` / `TestClient123!`) is assigned 18.
  Maroochy (`test12@example.invalid` / `TestClient123`) is assigned 3.
  Log in as Maroochy. Three means visibility works. Eighteen means every
  client can see the whole fleet, and that is the most serious thing on
  this page.

---

## Traps worth remembering

- `client_equipment.equipment_id` and `hours_log.equipment_id` hold the
  **numeric row id**. `content.equipment_id` holds the **'E001' plant code**.
  Same column name, two meanings.
- `content_images` joins on `content_id`, not equipment_id.
- The user table has **four** reset columns: `reset_otp`, `reset_otp_expiry`,
  `reset_token`, `reset_token_expiry`. Steps one and three use different pairs.
- The pull command template says `FILE.js`. It is plausible enough to paste
  without substituting, and has already been run verbatim once.
- Bash eats `!` in double-quoted curl payloads. Use single quotes.
