-- ===========================================================================
-- go-live-cleanup.sql
--
-- Removes all seeded test data before trading with real clients.
--
-- Run order matters: assignments, then clients, then users. Foreign keys
-- will refuse the deletes otherwise.
--
-- Everything seeded by docs/test-data.sql is identified by:
--   company_name LIKE 'TEST %'   on longtermhire_client
--   email LIKE '%@example.invalid' on longtermhire_user
--
-- Nothing here touches partner-owned machines or any real client.
-- ===========================================================================


-- --------------------------------------------------------------------------
-- 1. BEFORE. What is about to go, and what is being kept.
-- --------------------------------------------------------------------------
SELECT '--- BEFORE ---' AS stage;

SELECT company_name, user_id
FROM longtermhire_client
WHERE company_name LIKE 'TEST %'
ORDER BY company_name;

SELECT
  (SELECT COUNT(*) FROM longtermhire_client
     WHERE company_name LIKE 'TEST %')                        AS test_clients,
  (SELECT COUNT(*) FROM longtermhire_user
     WHERE email LIKE '%@example.invalid')                    AS test_users,
  (SELECT COUNT(*) FROM longtermhire_client_equipment ce
     JOIN longtermhire_client c ON c.user_id = ce.client_user_id
    WHERE c.company_name LIKE 'TEST %')                       AS test_assignments,
  (SELECT COUNT(*) FROM longtermhire_client
     WHERE company_name NOT LIKE 'TEST %')                    AS real_clients_kept,
  (SELECT COUNT(*) FROM longtermhire_client_equipment ce
     JOIN longtermhire_client c ON c.user_id = ce.client_user_id
    WHERE c.company_name NOT LIKE 'TEST %')                   AS real_assignments_kept;


-- --------------------------------------------------------------------------
-- 2. DELETE. Child rows first.
-- --------------------------------------------------------------------------
DELETE ce FROM longtermhire_client_equipment ce
  JOIN longtermhire_client c ON c.user_id = ce.client_user_id
 WHERE c.company_name LIKE 'TEST %';

DELETE FROM longtermhire_client
 WHERE company_name LIKE 'TEST %';

DELETE FROM longtermhire_user
 WHERE email LIKE '%@example.invalid';


-- --------------------------------------------------------------------------
-- 3. AVAILABILITY. Free only the machines that no longer have a live hire.
--
--    This is the corrected version. The teardown note in docs/test-data.sql
--    freed every owned machine unconditionally, which would wrongly mark a
--    genuinely hired machine as sitting in the yard.
-- --------------------------------------------------------------------------
UPDATE longtermhire_equipment_item e
   SET availability = 1
 WHERE owner_partner_id IS NULL
   AND NOT EXISTS (
        SELECT 1 FROM longtermhire_client_equipment ce
         WHERE ce.equipment_id = e.equipment_id
           AND ce.hire_status = 'active');


-- --------------------------------------------------------------------------
-- 4. AFTER. All three test counts should read 0.
-- --------------------------------------------------------------------------
SELECT '--- AFTER ---' AS stage;

SELECT
  (SELECT COUNT(*) FROM longtermhire_client
     WHERE company_name LIKE 'TEST %')                        AS test_clients_left,
  (SELECT COUNT(*) FROM longtermhire_user
     WHERE email LIKE '%@example.invalid')                    AS test_users_left,
  (SELECT COUNT(*) FROM longtermhire_client_equipment)        AS assignments_total,
  (SELECT COUNT(*) FROM longtermhire_client)                  AS clients_total,
  (SELECT COUNT(*) FROM longtermhire_equipment_item
     WHERE availability = 1)                                  AS machines_available,
  (SELECT COUNT(*) FROM longtermhire_equipment_item
     WHERE availability = 0)                                  AS machines_on_hire;


-- --------------------------------------------------------------------------
-- 5. LEFTOVERS. Not deleted automatically - look at these and decide.
--
--    The old developer's test accounts predate the TEST prefix convention
--    and will not be caught by the filters above. 'aef' with a gmail
--    address is the known one.
-- --------------------------------------------------------------------------
SELECT '--- REVIEW THESE BY HAND ---' AS stage;

SELECT user_id, company_name
  FROM longtermhire_client
 ORDER BY company_name;
