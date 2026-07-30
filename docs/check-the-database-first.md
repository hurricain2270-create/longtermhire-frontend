# Read the database before building anything

Twice in one session I built something that already existed, because I checked
the React components and the API layer and never looked at the schema.

- Built a `longtermhire_supplier` table. One already existed, better designed,
  with after-hours phone and ABN.
- Built a dispatch flow with hardcoded trades and a hardcoded playbook. There
  was already `longtermhire_trade` (13 real trade names), `fault_playbook`
  (send and request fields per fault type), `supplier_coverage`
  (supplier x trade x region with priority), and a complete working
  `routes/dispatch.js` with a proper state machine.

Before building any feature, run this and read the result:

```sql
SELECT table_name, table_rows FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name LIKE 'longtermhire%'
ORDER BY table_name;
```

Then `DESCRIBE` anything that sounds related, and
`grep -rl "<table_name>" --include=*.js .` to find code behind it. Empty tables
with thoughtful schemas usually mean someone scoped the feature properly and
the code is somewhere.

