-- Test data. Everything is prefixed TEST and uses example.invalid addresses,
-- so it is easy to find and easy to remove. Run the teardown at the bottom of
-- this file when you are done with it.

DELETE ce FROM longtermhire_client_equipment ce
  JOIN longtermhire_client c ON c.user_id = ce.client_user_id
  WHERE c.company_name LIKE 'TEST %';
DELETE FROM longtermhire_client WHERE company_name LIKE 'TEST %';
DELETE FROM longtermhire_user WHERE email LIKE '%@example.invalid';

INSERT INTO longtermhire_user (email, role_id, status, verify, company_id, created_at, updated_at)
VALUES
 ('test1@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test2@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test3@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test4@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test5@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test6@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test7@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test8@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test9@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test10@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test11@example.invalid','client',1,1,0,NOW(),NOW()),
 ('test12@example.invalid','client',1,1,0,NOW(),NOW());

SET @u1 = (SELECT id FROM longtermhire_user WHERE email='test1@example.invalid');
SET @u2 = (SELECT id FROM longtermhire_user WHERE email='test2@example.invalid');
SET @u3 = (SELECT id FROM longtermhire_user WHERE email='test3@example.invalid');
SET @u4 = (SELECT id FROM longtermhire_user WHERE email='test4@example.invalid');
SET @u5 = (SELECT id FROM longtermhire_user WHERE email='test5@example.invalid');
SET @u6 = (SELECT id FROM longtermhire_user WHERE email='test6@example.invalid');
SET @u7 = (SELECT id FROM longtermhire_user WHERE email='test7@example.invalid');
SET @u8 = (SELECT id FROM longtermhire_user WHERE email='test8@example.invalid');
SET @u9 = (SELECT id FROM longtermhire_user WHERE email='test9@example.invalid');
SET @u10 = (SELECT id FROM longtermhire_user WHERE email='test10@example.invalid');
SET @u11 = (SELECT id FROM longtermhire_user WHERE email='test11@example.invalid');
SET @u12 = (SELECT id FROM longtermhire_user WHERE email='test12@example.invalid');
SET @me = (SELECT id FROM longtermhire_user WHERE role_id='super_admin' LIMIT 1);
SET @m_E001 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E001');
SET @m_E002 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E002');
SET @m_E003 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E003');
SET @m_E004 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E004');
SET @m_E005 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E005');
SET @m_E006 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='E006');
SET @m_M001 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='M001');
SET @m_M002 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='M002');
SET @m_S001 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='S001');
SET @m_S002 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='S002');
SET @m_S003 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='S003');
SET @m_S004 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='S004');
SET @m_T001 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='T001');
SET @m_T002 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='T002');
SET @m_T003 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='T003');
SET @m_V001 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='V001');
SET @m_V002 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='V002');
SET @m_V003 = (SELECT id FROM longtermhire_equipment_item WHERE equipment_id='V003');

INSERT INTO longtermhire_client (user_id, client_name, company_name, phone, address, created_at, updated_at)
VALUES
 (@u1,'Dan Bradley','TEST Bradley Earthworks','0412 887 220','Ipswich QLD',NOW(),NOW()),
 (@u2,'Mick Carter','TEST Carter Civil','0413 442 110','Toowoomba QLD',NOW(),NOW()),
 (@u3,'Sue Nguyen','TEST Riverline Plant','0414 220 883','Caboolture QLD',NOW(),NOW()),
 (@u4,'Pete Walsh','TEST Hinterland Excavations','0417 553 902','Nambour QLD',NOW(),NOW()),
 (@u5,'Ana Silva','TEST Kestrel Contracting','0411 776 340','Gympie QLD',NOW(),NOW()),
 (@u6,'Joe Tan','TEST Two Rocks Earthmoving','0419 004 118','Maroochydore QLD',NOW(),NOW()),
 (@u7,'Marie Dubois','TEST Bli Bli Landscaping','0402 665 771','Bli Bli QLD',NOW(),NOW()),
 (@u8,'Tom Reed','TEST Coolum Site Services','0438 991 226','Coolum QLD',NOW(),NOW()),
 (@u9,'Raj Patel','TEST Northshore Plant Hire','0421 887 003','Redcliffe QLD',NOW(),NOW()),
 (@u10,'Kate Moss','TEST Verity Drainage','0407 332 991','Kilcoy QLD',NOW(),NOW()),
 (@u11,'Ben Harris','TEST Sandstone Civil','0433 118 007','Beerwah QLD',NOW(),NOW()),
 (@u12,'Lena Fox','TEST Maroochy Groundworks','0409 226 554','Buderim QLD',NOW(),NOW());

INSERT INTO longtermhire_client_equipment
 (client_user_id, equipment_id, assigned_by, custom_base_price, compounding_discount,
  hire_status, hire_start_date, created_at, updated_at)
VALUES
 (@u1, @m_E001, @me, 2350, 1.5, 'active', DATE_SUB(CURDATE(), INTERVAL 11 MONTH), NOW(), NOW()),
 (@u1, @m_E002, @me, 3200, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_E003, @me, 2150, 2.0, 'active', DATE_SUB(CURDATE(), INTERVAL 2 MONTH), NOW(), NOW()),
 (@u1, @m_E004, @me, 2900, 1.5, NULL, NULL, NOW(), NOW()),
 (@u1, @m_E005, @me, 2150, 2.0, 'active', DATE_SUB(CURDATE(), INTERVAL 5 MONTH), NOW(), NOW()),
 (@u1, @m_E006, @me, 3200, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_M001, @me, NULL, 2.0, 'active', DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW(), NOW()),
 (@u1, @m_M002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u1, @m_S001, @me, 2550, 1.0, 'active', DATE_SUB(CURDATE(), INTERVAL 8 MONTH), NOW(), NOW()),
 (@u1, @m_S002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_S003, @me, 3400, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_S004, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_T001, @me, NULL, 1.0, 'active', DATE_SUB(CURDATE(), INTERVAL 1 MONTH), NOW(), NOW()),
 (@u1, @m_T002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_T003, @me, 2700, 1.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_V001, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_V002, @me, 5100, 2.0, NULL, NULL, NOW(), NOW()),
 (@u1, @m_V003, @me, 4200, 1.5, NULL, NULL, NOW(), NOW()),
 (@u2, @m_E001, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u2, @m_E002, @me, 2350, 1.0, 'active', DATE_SUB(CURDATE(), INTERVAL 11 MONTH), NOW(), NOW()),
 (@u2, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_E004, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_E005, @me, 2600, 1.5, NULL, NULL, NOW(), NOW()),
 (@u2, @m_E006, @me, 2150, 1.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_M001, @me, 2950, 1.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_M002, @me, 3500, 1.5, NULL, NULL, NOW(), NOW()),
 (@u2, @m_S001, @me, 3700, 1.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_S002, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_S003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u2, @m_S004, @me, 2800, 2.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E001, @me, 2900, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E003, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E004, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E005, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u3, @m_E006, @me, 2900, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_M001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_M002, @me, 2750, 1.5, NULL, NULL, NOW(), NOW()),
 (@u3, @m_S001, @me, 2800, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_S002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u3, @m_S003, @me, 3100, 1.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_S004, @me, 3100, 2.0, NULL, NULL, NOW(), NOW()),
 (@u3, @m_T001, @me, 1850, 1.5, NULL, NULL, NOW(), NOW()),
 (@u3, @m_T002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E004, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E005, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u4, @m_E006, @me, 3200, 1.0, 'active', DATE_SUB(CURDATE(), INTERVAL 3 MONTH), NOW(), NOW()),
 (@u5, @m_E001, @me, 2350, 1.5, NULL, NULL, NOW(), NOW()),
 (@u5, @m_E002, @me, 3200, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_E003, @me, 2350, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_E004, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_E005, @me, 3500, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_E006, @me, 2900, 1.5, NULL, NULL, NOW(), NOW()),
 (@u5, @m_M001, @me, 4100, 1.5, NULL, NULL, NOW(), NOW()),
 (@u5, @m_M002, @me, 2750, 1.0, 'active', DATE_SUB(CURDATE(), INTERVAL 5 MONTH), NOW(), NOW()),
 (@u5, @m_S001, @me, 2800, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_S002, @me, 2350, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_S003, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_S004, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_T001, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_T002, @me, 3000, 1.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_T003, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_V001, @me, 3750, 1.0, NULL, NULL, NOW(), NOW()),
 (@u5, @m_V002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u5, @m_V003, @me, 4200, 1.0, NULL, NULL, NOW(), NOW()),
 (@u6, @m_E001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u6, @m_E002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u6, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u6, @m_E004, @me, 2350, 2.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E001, @me, 3500, 2.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E002, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E003, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E004, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E005, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_E006, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_M001, @me, 3800, 1.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_M002, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u7, @m_S001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E001, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E003, @me, 2900, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E004, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E005, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u8, @m_E006, @me, 3500, 2.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_M001, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u8, @m_M002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_S001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_S002, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_S003, @me, 2800, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_S004, @me, 3400, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_T001, @me, 3000, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_T002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_T003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_V001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u8, @m_V002, @me, 3950, 1.5, 'active', DATE_SUB(CURDATE(), INTERVAL 11 MONTH), NOW(), NOW()),
 (@u8, @m_V003, @me, 5100, 1.5, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E004, @me, 2900, 1.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E005, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_E006, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u9, @m_M001, @me, 3800, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E002, @me, 2350, 1.5, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E004, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E005, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_E006, @me, 3200, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_M001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_M002, @me, 4100, 1.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_S001, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_S002, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u10, @m_S003, @me, 3400, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E001, @me, 3200, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E002, @me, 2900, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E004, @me, 2900, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E005, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_E006, @me, 3500, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_M001, @me, 3500, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_M002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_S001, @me, 2800, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_S002, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_S003, @me, 2350, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_S004, @me, 3400, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_T001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_T002, @me, NULL, 1.5, NULL, NULL, NOW(), NOW()),
 (@u11, @m_T003, @me, 2400, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_V001, @me, NULL, 2.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_V002, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u11, @m_V003, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u12, @m_E001, @me, NULL, 1.0, NULL, NULL, NOW(), NOW()),
 (@u12, @m_E002, @me, 2900, 1.5, NULL, NULL, NOW(), NOW()),
 (@u12, @m_E003, @me, 3500, 1.0, NULL, NULL, NOW(), NOW());

UPDATE longtermhire_equipment_item SET availability = 0 WHERE equipment_id IN ('E001','E003','E005','T001','S001','M001','E002','T002','E006','V001','M002','T003','V002');

SELECT 'done' AS status,
  (SELECT COUNT(*) FROM longtermhire_client WHERE company_name LIKE 'TEST %') AS clients,
  (SELECT COUNT(*) FROM longtermhire_client_equipment) AS assignments,
  (SELECT COUNT(*) FROM longtermhire_client_equipment WHERE hire_status='active') AS on_hire;

-- ---------------------------------------------------------------------------
-- To remove all of this again:
--
--   DELETE ce FROM longtermhire_client_equipment ce
--     JOIN longtermhire_client c ON c.user_id = ce.client_user_id
--     WHERE c.company_name LIKE 'TEST %';
--   DELETE FROM longtermhire_client WHERE company_name LIKE 'TEST %';
--   DELETE FROM longtermhire_user WHERE email LIKE '%@example.invalid';
--   UPDATE longtermhire_equipment_item SET availability = 1
--     WHERE owner_partner_id IS NULL;
-- ---------------------------------------------------------------------------
