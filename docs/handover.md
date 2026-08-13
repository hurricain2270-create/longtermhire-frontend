# LongTermHire — where things stand

Written at the end of a long session so a fresh one can pick up cold.

## The system

**Frontend** React/TS/Tailwind/Vite on AWS Amplify, app `d1an4z7ngqc3wv`,
longtermhire.com, repo `hurricain2270-create/longtermhire-frontend`.

**Backend** Node/Express on EC2 `16.170.248.93`, ubuntu user, PM2 process
`longtermhire`, routes at
`/home/ubuntu/mkd-backend-flow-builder/mtpbk/custom/longtermhire_backend/routes/`.

**Database** MySQL RDS. **Files** S3 (`com.mkdlabs.images`, us-east-2).
**Mail** Zoho, now on the paid Standard plan.

Four doors: admin, `/client/login`, `/partner/<token>`, `/dispatch/<token>`.
The last two have no password — the token in the address is the credential.

## How to work on it

Claude edits through the GitHub API; Cain runs commands on EC2. Backend changes
need a paste. **Always use the cache-buster** — a plain raw.githubusercontent
fetch serves stale files and cost two rounds of debugging:

```bash
cd /home/ubuntu/mkd-backend-flow-builder/mtpbk/custom/longtermhire_backend/routes && \
sudo python3 -c "
import urllib.request, time
u='https://raw.githubusercontent.com/hurricain2270-create/longtermhire-frontend/main/backend-routes/FILE.js?t='+str(int(time.time()))
open('FILE.js','wb').write(urllib.request.urlopen(u).read())
print('fetched')
" ; node --check FILE.js && pm2 restart longtermhire && echo RESTARTED
```

Frontend changes need no paste, only an Amplify deploy. Judge it by the last
commit on the branch, not the green tick. The service worker means a hard
refresh does not clear a stale bundle — quit the browser entirely.

## Lessons that keep costing time

**Check the database before writing a query.** Caught out five times in one day.
`longtermhire_equipment_item` has no `description`; `longtermhire_content_images`
joins on `content_id` not `equipment_id`; `longtermhire_user` has `role_id` not
`role`. Run this first, every time:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'x' ORDER BY ordinal_position;
```

**Foreign keys bite constantly.** A company needs `owner_user_id`; a machine
needs `user_id`; `client_equipment` needs `assigned_by`. All must point at a
real user.

**Never declare a component containing form fields inside another component.**
Focus is lost on every keystroke. Hit three times — intro film panels, the
partner portal `Shell`, and nearly a fourth.

**Escaped apostrophes inside a template literal** resolve before the browser
sees them, so `\'` becomes a bare quote and kills the script. Use `&#39;`.

**`config.upload_type` is never set** in this deployment. Anything testing it
falls through to local disk, which nothing serves. Call `UploadService.s3_upload()`
directly. `fault.js` still has this bug and its upload route is probably dead.

**Chain edits through one working file.** Building a second change from a fresh
copy of the repo silently discarded the first.

## Done this session

**Email was completely broken** and reporting success. Cain's Zoho password
change invalidated `MAIL_PASS`, and the paid upgrade moved the host to
`smtppro.zoho.com`. Nothing had sent for days. Now fixed; test with
`curl smtps://smtppro.zoho.com:465`. The mail service still does not report
failures — worth fixing.

**Zoho** upgraded to Standard because IMAP, POP and forwarding are paid-only.
Two days went into Apple Mail before the real error appeared: "You are yet to
enable IMAP." Now working on Mac and iPhone. `ADMIN_NOTIFY_EMAIL` points at
`admin@longtermhire.com`.

**Security.** Six unauthenticated endpoints closed, including a `_test/mint`
route that minted working dispatch links from any three ids, and a content
DELETE. Password logging removed. Three public test-mail endpoints stubbed.
A dashboard link labelled "clear all" was deleting client equipment requests
with no confirmation.

**Partners** — a third portal for people with idle plant. Add a partner, they
get a tokenless link, list a machine in five steps with photos and an insurance
certificate, name their price. You set a margin at approval and the client price
follows from it. Purple everywhere a partner is involved: tiles, plant codes
(P001), hire management, emails. An "Ask us" message box, no chat.

**Onboarding** — send a form, they fill it on a phone, it lands under
Submissions on Client Management. Address captured in four parts matching the
client record. A "Start onboarding" popup lists the twelve steps in order.

**A proper welcome email** replacing the bare credentials note, which is now
only used for resends. Green Send welcome, grey Resend login, and Welcomed once
sent.

**Rates by client** — a printable sheet, nothing stored, grouped by company,
showing list price against what each actually pays. Yellow for a custom rate,
purple for a partner machine.

**The film** rewritten. Nineteen panels, about two and a quarter minutes, aimed
at the man choosing between suppliers rather than deciding whether to hire. Opens
on a desk phone ringing out. Sound toggle wired for one clip per panel, waiting
on audio files — script at `docs/voiceover-script.md`.

**Hire rate calculator** on the Price History page. Also: quiet refresh on five
pages, a SaveButton that shows its state, default quote terms in code, twelve
test clients, tile sizing, dashboard gauges honest with no data, and clients can
finally change their password (the function was never written).

## Outstanding

**Forgot-password flow does not exist.** The login page links to it, the
frontend functions are written, the backend endpoints return 404. A locked-out
client must ring Cain. Decision made: build it, and log login locations so a
shared account is visible. Not started.

**Passwords still emailed in plain text**, two places.

**Permissions are browser-side only.** A logged-in supervisor could reach fault
data through the API.

**Turnover months disagree** between the dashboard dial and Reporting.

**Twelve of eighteen machines have no service schedule.** Data, not code.

**No public film.** Agreed to wait for traction, then hand the script to a
motion designer.

Smaller: 336 console statements, API address hardcoded seven times, `fault.js`
upload bug, an equipment list query that does not return the owner's name so the
"Not ours" badge cannot show there, 15 stopped EC2 instances still billing.

## Credentials seen in this conversation

Rotate at some point: AWS key `AKIAZI2LF5M6QMTFE5JL`, Zoho app passwords, and
the current GitHub token. The old GitHub token with `delete_repo` and no expiry
has been revoked.

## Test data

`docs/test-data.sql` — twelve TEST-prefixed clients with a realistic spread.
Teardown commented at the bottom of the file.
