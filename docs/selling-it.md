# If this were ever sold to someone else

Written while thinking out loud, not because anyone is asking. Keeping it here
so the thinking is not lost and so decisions made now do not close doors later.

## The shape it would take

Not an exe. This is a web application with a server, a database, and outside
parties — a supervisor on a phone, a subcontractor tapping a link in an email.
Wrapped as a desktop program it would still need to be online for any of that
to work, and the parts that make it worth having would be the parts that broke.

The equivalent that does work is **their own installation of the same web app**,
at their own address, with their logo and their colours. Same experience, no
download.

Two models, and they are different businesses:

**Sell them a copy.** They run it on their own AWS. Simplest to walk away from,
but nothing stops them onselling it, and support means debugging a codebase you
cannot see.

**Licence access, hosted here.** They pay monthly, never touch the code. Better
commercially, easier to protect — the thing worth copying never leaves the
server. But it makes this a software business with uptime obligations, on top of
a hire business.

## What would have to be built first

### Their branding, not ours

`#FDCE06` appears in dozens of files. The logo is a fixed image. Emails are
signed Long Term Hire, the intro film says the name out loud, and the API
address is hardcoded in seven places.

Doing this properly means a settings table — company name, logo, primary colour,
the from address — and CSS variables in place of the literals. Perhaps two days.
Not hard, but it touches everything.

### A blank canvas

The hardest of the three, and the least obvious. Every screen assumes the data
already exists, because we built it up by hand over weeks. A new customer opens
the portal to nothing at all: no machines, no categories, no trades, no
playbooks, no service intervals.

That needs setup wizards, sensible defaults, and a first-run path that gets
someone from empty to useful in an afternoon. It is a bigger job than the
branding and probably bigger than the licence key.

Worth noting: the trades and fault playbooks already in the database are a
reasonable starting set for any plant hire business. Those would ship as
defaults rather than being built per customer.

### Knowing it is still paid for, without seeing their data

The elegant one. A licence key that checks in periodically and gets back yes or
no. We learn that an installation is alive and nothing else — their machines,
clients, rates and fault history never leave their server.

A few hours' work, and it is the standard approach for exactly this reason.

## What a licence has to say

Not legal advice, and a real one needs an Australian commercial solicitor. But
the questions it has to answer:

- What they can do with it. Modify? Resell? Run more than one installation?
- What happens when they stop paying. Does it stop, or degrade, or keep running?
- Who owns the data they put in. Theirs, clearly, but say so.
- **What we are liable for when it breaks.** This one matters more than it
  looks. The system now dispatches subcontractors. If it sends the wrong trade
  to the wrong site, or a fault email silently fails and a machine sits idle for
  a day, someone will ask whose fault that is.
- What support means, and what it costs.

## Our data is not part of the deal

The price history is ours. So is the fault history — what actually goes wrong
with these machines and what fixes it. That is worth more than the software and
it should be carved out explicitly, not left to be argued about later.

## The honest sequencing

None of the above pays off until somebody is buying. And what would make it
sellable is not the packaging — it is having run it for a year and being able to
answer "what happens when a supplier does not respond", "how do you handle a
machine that moves site mid-hire", "what does it cost us to switch".

Run it. Fix what the running exposes. Package it if someone asks.
