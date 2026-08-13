-- ===========================================================================
-- partner-test-cleanup.sql
--
-- Removes the two junk listings created while building the partner portal:
--   P001  "3336"
--   P002  "3453455"
--
-- Deletes in dependency order:
--   content_images  (joins content on content_id)
--     -> content    (joins equipment on equipment_id, the 'P001' style code)
--       -> equipment_item
--
-- Does NOT touch longtermhire_partner. Vic / Banpac (id 2) is left in place.
-- If he turns out to be a test invention too, remove him from the Partners
-- page afterwards - one row, no dependencies once these listings are gone.
--
-- Does NOT touch the S3 objects behind image_url. Those become orphaned and
-- need a separate pass if the bucket is to be tidy.
-- ===========================================================================


-- --------------------------------------------------------------------------
-- 1. BEFORE
-- --------------------------------------------------------------------------
SELECT '--- BEFORE ---' AS stage;

SELECT equipment_id, equipment_name, availability, owner_partner_id, partner_status
  FROM longtermhire_equipment_item
 WHERE equipment_id IN ('P001','P002');

SELECT id, equipment_id, equipment_name
  FROM longtermhire_content
 WHERE equipment_id IN ('P001','P002');

SELECT ci.id, ci.content_id, ci.image_url
  FROM longtermhire_content_images ci
  JOIN longtermhire_content c ON c.id = ci.content_id
 WHERE c.equipment_id IN ('P001','P002');


-- --------------------------------------------------------------------------
-- 2. DELETE, deepest child first
-- --------------------------------------------------------------------------
DELETE ci FROM longtermhire_content_images ci
  JOIN longtermhire_content c ON c.id = ci.content_id
 WHERE c.equipment_id IN ('P001','P002');

DELETE FROM longtermhire_content
 WHERE equipment_id IN ('P001','P002');

DELETE FROM longtermhire_equipment_item
 WHERE equipment_id IN ('P001','P002');


-- --------------------------------------------------------------------------
-- 3. AFTER. First three counts should be 0. Fleet should be 18, all available.
-- --------------------------------------------------------------------------
SELECT '--- AFTER ---' AS stage;

SELECT
  (SELECT COUNT(*) FROM longtermhire_equipment_item
     WHERE equipment_id IN ('P001','P002'))                   AS junk_items_left,
  (SELECT COUNT(*) FROM longtermhire_content
     WHERE equipment_id IN ('P001','P002'))                   AS junk_content_left,
  (SELECT COUNT(*) FROM longtermhire_content_images ci
     LEFT JOIN longtermhire_content c ON c.id = ci.content_id
    WHERE c.id IS NULL)                                       AS orphaned_images,
  (SELECT COUNT(*) FROM longtermhire_equipment_item)          AS fleet_total,
  (SELECT COUNT(*) FROM longtermhire_equipment_item
     WHERE availability = 1)                                  AS available,
  (SELECT COUNT(*) FROM longtermhire_equipment_item
     WHERE availability = 0)                                  AS unavailable;

SELECT equipment_id, equipment_name, availability
  FROM longtermhire_equipment_item
 ORDER BY equipment_id;
