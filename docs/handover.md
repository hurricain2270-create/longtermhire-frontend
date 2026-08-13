# Where things stand

Written at the end of a long session so the next one can pick up without
re-deriving everything. Read this first.

## The stack

- **Frontend**: React/TS/Tailwind/Vite on AWS Amplify, app `d1an4z7ngqc3wv`,
  `longtermhire.com`. Repo `hurricain2270-create/longtermhire-frontend`.
- **Backend**: Node/Express on EC2 `16.170.248.93`, PM2 process `longtermhire`,
  live path `/home/ubuntu/mkd-backend-flow-builder/mtpbk/custom/longtermhire_backend/routes/`.
- **Database**: MySQL RDS. Credentials read from `.env` in the `mtpbk` folder.
- **Mail**: Zoho, now on a **paid plan**. Host is `smtppro.zoho.com`, not
  `smtp.zoho.com`. IMAP only works on paid.

## How work gets done

Claude has no access to the server. Everything goes: edit locally, compile
check, push to GitHub, then Cain pastes a command on EC2 to pull and restart.

**Always use the cache buster on a pull.** A plain fetch serves stale files from
GitHub's raw cache and cost two rounds of debugging this session:

```bash
cd /home/ubuntu/mkd-backend-flow-builder/mtpbk/custom/longtermhire_backend/routes && \
sudo python3 -c "
import urllib.request, time
u='https://raw.githubusercontent.com/hurricain2270-create/longtermhire-frontend/main/backend-routes/FILE.js?t='+str(int(time.time()))
open('FILE.js','wb').write(urllib.request.urlopen(u).read())
print('fetched')
" ; node --check FILE.js && pm2 restart longtermhire && echo "RESTARTED"
```

`--update-env` is needed on `pm2 restart` after any `.env` change.

## Rules learnt the hard way

1. **Check the database schema before writing any query.** Violated five times
   in one session. `docs/check-the-database-first.md` exists and was ignored.
   Columns that do not exist: `description` on equipment_item, `role` on user.
   `content_images` joins on **content_id**, not equipment_id.
2. **Never declare a component containing form fields inside another
   component.** Focus is lost on every keystroke. Hit three times now.
3. **Chain edits through one working file.** Building change B from a fresh copy
   of the repo silently discarded change A before it was pushed.
4. **Foreign keys bite constantly.** A company needs an owner user. A machine
   needs a user_id. An assignment needs assigned_by. Check before inserting.
5. **`config.upload_type` is never set in this deployment.** Any route testing
   it falls through to local disk, which nothing serves. Call
   `UploadService.s3_upload()` directly.
6. **Amplify caches hard.** Quit the browser entirely, not just refresh.

## Built this session

- **Email fixed system wide.** A Zoho password change had silently broken every
  outgoing email; the app reported "Sent" regardless. Host and password updated
  in `.env`.
- **Onboarding form** — send a link, they fill it in, lands under Submissions on
  Client Management. Address in four parts matching the client record.
- **Partner portal** at `/partner/:token` — a machine owner lists idle plant in
  five steps with photos and an insurance certificate, names his price, and can
  update hours and photos afterwards. Any edit is flagged for review but does
  not pull a live machine off the client's screen.
- **Partner admin page** with approval, a review panel showing everything they
  sent, and a margin box that works out the client price. Partner machines are
  marked **purple** everywhere: tiles, plant codes, hire management, emails,
  the rate sheet.
- **Hire rate calculator** — what a machine must earn to be worth owning. Lives
  beside Price History. Monthly cash position curve, cash vs accounting kept
  separate.
- **Rates by client** — printable sheet, who sees what and what they pay.
- **A proper welcome email**, separate from the credentials resend.
- **The film**, rewritten. Nineteen panels, ~2m15. Aimed at whoever chooses the
  supplier, not someone deciding whether to hire. Audio wiring is in: one clip
  per panel, sound off by default, missing files fall back to timings.
  Script at `docs/voiceover-script.md`, nineteen lines.
- **Security**: five unauthenticated admin endpoints closed, a public token
  minter removed, plain-text password logging removed, public test mail routes
  stubbed. The old GitHub token with `delete_repo` and no expiry is revoked.

## Still open

- **Forgot password does not exist.** The link is on the client login page and
  the frontend functions are written, but there are no backend endpoints — a
  404. A locked-out client has to ring. Either build it or remove the link.
- **Login logging** was agreed as the way to spot a shared account, rather than
  one-session-at-a-time which would annoy honest users. Not built.
- Passwords still emailed in plain text, two places.
- Permissions enforced browser-side only, not on the API.
- Twelve of eighteen machines have no service schedule; none have information
  sheets. Data entry, not code.
- Turnover months disagree between the dashboard dial and Reporting. Parked
  deliberately — needs both screens open to diagnose.
- 336 console statements; API address hardcoded in seven places.
- Voiceover audio files not yet generated.

## Test data

`docs/test-data.sql` seeds twelve clients with a realistic spread of visibility
and hires, all prefixed `TEST` and using `@example.invalid` addresses. The
teardown is commented at the bottom of that file. **Remove it before real
trading.**

## How Cain works

Build first and look at it, rather than specify up front. Direct language.
Catches commercial and copy problems instinctively — the film's audience, the
levies belonging on a quote, delivery not being the same as site. If he says
something reads wrong, it reads wrong.
