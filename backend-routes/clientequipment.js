const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const MailService = require("../../../baas/services/MailService");

module.exports = function (app) {
  // Get client's assigned equipment with pricing and discounts
  app.get(
    "/v1/api/longtermhire/client/equipment",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log("🔍 Getting equipment for client user:", req.user_id);

        // Get category filter from query params
        const categoryFilter = req.query.categories || req.query["categories[]"];
        const selectedCategories = categoryFilter
          ? Array.isArray(categoryFilter)
            ? categoryFilter
            : [categoryFilter]
          : [];

        console.log("📂 Category filter:", selectedCategories);

        // First, get the user's company_id from company_member table
        // Note: A member should only belong to ONE company
        const companyQuery = `
          SELECT company_id, role
          FROM longtermhire_company_member
          WHERE user_id = ?
          LIMIT 1
        `;
        const companyResult = await sdk.rawQuery(companyQuery, [req.user_id]);

        let whereClause;
        let queryParams;
        let userRole = null;

        if (companyResult && companyResult.length > 0) {
          // User is a company member - fetch all equipment for their company
          const companyId = companyResult[0].company_id;
          userRole = companyResult[0].role;

          console.log(
            `👥 User is member of company ${companyId}, fetching company equipment`
          );
          console.log(`👔 User role: ${userRole}`);

          // Engineers, Supervisors, and Company Owners see all equipment for their company
          whereClause = `
            WHERE ce.client_user_id IN (
              SELECT user_id
              FROM longtermhire_company_member
              WHERE company_id = ?
            )
          `;
          queryParams = [companyId];
        } else {
          // User is not a company member - fetch only their personal equipment
          console.log(
            `👤 User is not a company member, fetching personal equipment`
          );
          whereClause = "WHERE ce.client_user_id = ?";
          queryParams = [req.user_id];
        }

        // Add category filtering if categories are selected
        if (selectedCategories.length > 0) {
          const categoryPlaceholders = selectedCategories
            .map(() => "?")
            .join(",");
          whereClause += ` AND e.category_name IN (${categoryPlaceholders})`;
          queryParams.push(...selectedCategories);
          console.log("🔍 Filtering by categories:", selectedCategories);
        }

        // Get equipment assigned to this client with content, images, and pricing
        const equipment = await sdk.rawQuery(
          `
          SELECT
            e.*,
            c.description as content_description,
            c.banner_description,
            c.image_url as content_image,
            GROUP_CONCAT(
              CASE WHEN ci.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', ci.id,
                  'image_url', ci.image_url,
                  'image_order', ci.image_order,
                  'is_main', ci.is_main,
                  'caption', ci.caption
                )
              ELSE NULL END
              ORDER BY ci.image_order ASC SEPARATOR '|||'
            ) as content_images,
            pp.name as package_name,
            pp.description as package_description,
            pp.discount_type as package_discount_type,
            pp.discount_value as package_discount_value,
            ce.custom_base_price,
            ce.discount,
            ce.discount_type,
            ce.compounding_discount_type,
            ce.compounding_discount,
            e.minimum_duration,
            CASE
              WHEN ce.discount_type = '%' THEN COALESCE(ce.custom_base_price, e.base_price) - (COALESCE(ce.custom_base_price, e.base_price) * ce.discount / 100)
              WHEN ce.discount_type = '$' THEN COALESCE(ce.custom_base_price, e.base_price) - ce.discount
              ELSE COALESCE(ce.custom_base_price, e.base_price)
            END as discounted_price
          FROM longtermhire_client_equipment ce
          JOIN longtermhire_equipment_item e ON ce.equipment_id = e.id
          LEFT JOIN longtermhire_content c ON e.id = c.equipment_id
          LEFT JOIN longtermhire_content_images ci ON c.id = ci.content_id
          LEFT JOIN longtermhire_client_pricing cp ON cp.client_user_id = ce.client_user_id
          LEFT JOIN longtermhire_pricing_package pp ON cp.pricing_package_id = pp.id
          ${whereClause}
          GROUP BY e.id, c.id, pp.id
          ORDER BY e.category_name, e.position ASC, e.equipment_name
        `,
          queryParams
        );

        console.log(
          `✅ Found ${equipment.length} equipment items for client (including unavailable)`
        );

        // Get maintenance periods for all equipment
        const equipmentIds = equipment.map((item) => item.id);
        let maintenancePeriods = [];

        if (equipmentIds.length > 0) {
          const placeholders = equipmentIds.map(() => "?").join(",");
          maintenancePeriods = await sdk.rawQuery(
            `SELECT equipment_id, start_date, end_date 
             FROM longtermhire_equipment_maintenance 
             WHERE equipment_id IN (${placeholders})
             ORDER BY start_date ASC`,
            equipmentIds
          );
        }

        // Group maintenance periods by equipment_id
        const maintenanceByEquipment = maintenancePeriods.reduce(
          (acc, period) => {
            if (!acc[period.equipment_id]) {
              acc[period.equipment_id] = [];
            }
            acc[period.equipment_id].push({
              start_date: period.start_date,
              end_date: period.end_date,
            });
            return acc;
          },
          {}
        );

        // Process equipment data to determine discount information and parse images
        const processedEquipment = equipment.map((item) => {
          // Determine discount type and value with proper priority:
          // 1. Equipment-specific custom discount (highest priority)
          // 2. Pricing package discount (fallback)
          // 3. No discount (base price)
          let discount_type = null;
          let discount_value = 0;
          let compounding_discount_type = null;
          let compounding_discount_value = 0;
          let discount_source = null;

          // Use custom base price if available
          const base_price = item.custom_base_price
            ? parseFloat(item.custom_base_price)
            : parseFloat(item.base_price);

          if (item.discount > 0) {
            // Use equipment-specific custom discount (highest priority)
            discount_type = item.discount_type === "%" ? "percentage" : "fixed";
            discount_value = parseFloat(item.discount);
            discount_source = "equipment_specific";
          } else if (
            item.package_discount_type !== null &&
            item.package_discount_value
          ) {
            // Use pricing package discount (fallback)
            discount_type =
              item.package_discount_type === 0 ? "percentage" : "fixed";
            discount_value = parseFloat(item.package_discount_value);
            discount_source = "pricing_package";
          }

          // Get compounding discount if exists
          if (item.compounding_discount > 0) {
            compounding_discount_type =
              item.compounding_discount_type === "%" ? "percentage" : "fixed";
            compounding_discount_value = parseFloat(item.compounding_discount);
          }

          // Process images data
          let images = [];
          if (item.content_images && item.content_images !== "null") {
            try {
              const imageStrings = item.content_images.split("|||");
              images = imageStrings
                .map((imgStr) => {
                  try {
                    const parsed = JSON.parse(imgStr);
                    return parsed && parsed.id !== null ? parsed : null;
                  } catch (e) {
                    return null;
                  }
                })
                .filter((img) => img !== null && img.id !== null);
            } catch (e) {
              images = [];
            }
          }

          // Get maintenance periods for this equipment
          const maintenance_periods = maintenanceByEquipment[item.id] || [];

          // Calculate equipment status
          const now = new Date();
          let status = "Available";

          // Check if currently in maintenance
          const inMaintenance = maintenance_periods.some((period) => {
            const start = new Date(period.start_date);
            const end = new Date(period.end_date);
            return now >= start && now <= end;
          });

          if (inMaintenance) {
            status = "Maintenance";
          } else if (item.availability === 0 || item.availability === false) {
            status = "Unavailable";
          }

          return {
            id: item.id,
            equipment_id: item.equipment_id,
            name: item.equipment_name,
            equipment_name: item.equipment_name,
            category_name: item.category_name,
            category_name: item.category_name,
            base_price: base_price,
            discounted_price: parseFloat(item.discounted_price || base_price),
            discount_type: discount_type,
            discount_value: discount_value,
            discount: discount_value, // Map for frontend compatibility
            compounding_discount_type: compounding_discount_type,
            compounding_discount_value: compounding_discount_value,
            compounding_discount: compounding_discount_value, // Map for frontend compatibility
            discount_source: discount_source,
            minimum_duration: item.minimum_duration,
            availability: item.availability,
            unavailability_due_month: item.unavailability_due_month,
            maintenance_periods: maintenance_periods,
            status: status,
            description: item.content_description,
            image: item.content_image,
            allImages: images,
            content: {
              description: item.content_description,
              banner_description: item.banner_description,
              image: item.content_image, // Keep for backward compatibility
              images: images, // Use the parsed images from longtermhire_content_images table
            },
            pricing_package: {
              name: item.package_name,
              description: item.package_description,
            },
          };
        });

        // Group equipment by category for better organization
        const groupedEquipment = processedEquipment.reduce((acc, item) => {
          const category = item.category_name || "Uncategorized";
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {});

        return res.status(200).json({
          error: false,
          data: {
            equipment: processedEquipment,
            grouped_equipment: groupedEquipment,
            total_count: processedEquipment.length,
          },
          message: "Equipment retrieved successfully",
        });
      } catch (error) {
        console.error("Get client equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get specific equipment details for client
  app.get(
    "/v1/api/longtermhire/client/equipment/:equipmentId",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const { equipmentId } = req.params;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log(
          "🔍 Getting equipment details for client:",
          req.user_id,
          "equipment:",
          equipmentId
        );

        // Verify client has access to this equipment
        const equipment = await sdk.rawQuery(
          `
          SELECT 
            e.*,
            c.description as content_description,
            c.banner_description,
            c.image_url as content_image,
            GROUP_CONCAT(
              CASE WHEN ci.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', ci.id,
                  'image_url', ci.image_url,
                  'image_order', ci.image_order,
                  'is_main', ci.is_main,
                  'caption', ci.caption
                )
              ELSE NULL END
              ORDER BY ci.image_order ASC SEPARATOR '|||'
            ) as content_images,
            pp.name as package_name,
            pp.description as package_description,
            pp.discount_type as package_discount_type,
            pp.discount_value as package_discount_value,
            ce.custom_discount_type,
            ce.custom_discount_value,
            e.minimum_duration,
            CASE 
              WHEN ce.custom_discount_type = 'percentage' THEN e.base_price - (e.base_price * ce.custom_discount_value / 100)
              WHEN ce.custom_discount_type = 'fixed' THEN e.base_price - ce.custom_discount_value
              WHEN pp.discount_type = 0 THEN e.base_price - (e.base_price * pp.discount_value / 100)
              WHEN pp.discount_type = 1 THEN e.base_price - pp.discount_value
              ELSE e.base_price
            END as discounted_price
          FROM longtermhire_client_equipment ce
          JOIN longtermhire_equipment_item e ON ce.equipment_id = e.id
          LEFT JOIN longtermhire_content c ON e.id = c.equipment_id
          LEFT JOIN longtermhire_content_images ci ON c.id = ci.content_id
          LEFT JOIN longtermhire_client_pricing cp ON cp.client_user_id = ce.client_user_id
          LEFT JOIN longtermhire_pricing_package pp ON cp.pricing_package_id = pp.id
          WHERE ce.client_user_id = ? AND e.id = ?
          GROUP BY e.id, c.id, pp.id
        `,
          [req.user_id, equipmentId]
        );

        if (!equipment || equipment.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Equipment not found or not assigned to you",
          });
        }

        const item = equipment[0];

        // Determine discount type and value with proper priority:
        // 1. Equipment-specific custom discount (highest priority)
        // 2. Pricing package discount (fallback)
        // 3. No discount (base price)
        let discount_type = null;
        let discount_value = 0;
        let discount_source = null;

        if (item.custom_discount_type && item.custom_discount_value) {
          // Use equipment-specific custom discount (highest priority)
          discount_type = item.custom_discount_type;
          discount_value = parseFloat(item.custom_discount_value);
          discount_source = "equipment_specific";
        } else if (
          item.package_discount_type !== null &&
          item.package_discount_value
        ) {
          // Use pricing package discount (fallback)
          discount_type =
            item.package_discount_type === 0 ? "percentage" : "fixed";
          discount_value = parseFloat(item.package_discount_value);
          discount_source = "pricing_package";
        }

        // Process images data
        let images = [];
        if (item.content_images && item.content_images !== "null") {
          try {
            const imageStrings = item.content_images.split("|||");
            images = imageStrings
              .map((imgStr) => {
                try {
                  const parsed = JSON.parse(imgStr);
                  return parsed && parsed.id !== null ? parsed : null;
                } catch (e) {
                  return null;
                }
              })
              .filter((img) => img !== null && img.id !== null);
          } catch (e) {
            images = [];
          }
        }

        return res.status(200).json({
          error: false,
          data: {
            id: item.id,
            equipment_id: item.equipment_id,
            equipment_name: item.equipment_name,
            category_name: item.category_name,
            base_price: parseFloat(item.base_price),
            discounted_price: parseFloat(
              item.discounted_price || item.base_price
            ),
            discount_type: discount_type,
            discount_value: discount_value,
            discount_source: discount_source,
            minimum_duration: item.minimum_duration,
            availability: item.availability,
            content: {
              description: item.content_description,
              banner_description: item.banner_description,
              image: item.content_image, // Keep for backward compatibility
              images: images, // Use the parsed images from longtermhire_content_images table
            },
            pricing_package: {
              name: item.package_name,
              description: item.package_description,
            },
          },
          message: "Equipment details retrieved successfully",
        });
      } catch (error) {
        console.error("Get client equipment details error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Submit equipment request
  app.post(
    "/v1/api/longtermhire/client/equipment/request",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const { equipment_id, message } = req.body;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        if (!equipment_id) {
          return res.status(400).json({
            error: true,
            message: "Equipment ID is required",
          });
        }

        console.log("📝 Client submitting equipment request:", {
          client_user_id: req.user_id,
          equipment_id,
          message,
        });

        // Check if equipment exists and is available
        const equipment = await sdk.findOne("equipment_item", {
          id: equipment_id,
          availability: 1,
        });

        if (!equipment) {
          return res.status(404).json({
            error: true,
            message: "Equipment not found or not available",
          });
        }

        // Create the request
        const request = await sdk.create("request", {
          client_user_id: req.user_id,
          equipment_id: equipment_id,
          message: message || "",
          status: "pending",
          created_at: new Date(),
          updated_at: new Date(),
        });

        console.log("✅ Equipment request created:", request.id);

        // Attempt to notify admin via email
        try {
          const config = app.get("configuration");
          const mailService = new MailService(config);

          const to = "admin@longtermhire.com";
          const from =
            (config.mail && config.mail.from_mail) ||
            "noreply@equipmenthire.com";

          const htmlContent = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
              <div style="background-color: #1F1F20; padding: 24px; border-radius: 8px; border: 2px solid #E5E7EB;">
                <h2 style="color: #E5E5E5; margin: 0; font-weight: 500;">📝 New Equipment Request</h2>
                <p style="color: #ADAEBC; margin: 12px 0 0 0;">A client submitted a new equipment request.</p>
                <div style="background: #292A2B; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #444444;">
                  <p style="color: #E5E5E5; margin: 0;">
                    <strong style="color:#FDCE06;">Request ID:</strong> ${request.id || "(pending id)"
            }<br/>
                    <strong style="color:#FDCE06;">Client User ID:</strong> ${req.user_id
            }<br/>
                    <strong style="color:#FDCE06;">Equipment ID:</strong> ${equipment_id}<br/>
                    <strong style="color:#FDCE06;">Equipment Name:</strong> ${equipment.equipment_name || "N/A"
            }<br/>
                    <strong style="color:#FDCE06;">Message:</strong> ${message || ""
            }
                  </p>
                </div>
                <p style="color:#ADAEBC; margin: 0;">Please review this request in the admin chat.</p>
                <p style="color:#666; font-size:12px; margin-top:16px;">Sent on ${new Date().toLocaleString(
              "en-AU",
              { timeZone: "Australia/Melbourne" }
            )}</p>
              </div>
            </div>`;

          await mailService.send(
            from,
            to,
            "📝 New Equipment Request Submitted",
            htmlContent
          );

          console.log(`📧 Admin notification sent to ${to}.`);
        } catch (mailErr) {
          console.error("❌ Failed to send admin notification email:", mailErr);
        }

        return res.status(201).json({
          error: false,
          data: request,
          message: "Equipment request submitted successfully",
        });
      } catch (error) {
        console.error("Submit equipment request error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get quote configuration for a specific equipment
  app.get(
    "/v1/api/longtermhire/client/equipment/:equipmentId/quote-config",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { equipmentId } = req.params;

        console.log(
          `🔍 Getting quote config for equipment ${equipmentId}, user ${req.user_id}`
        );

        // First, get the equipment's numeric id if equipmentId is an equipment_id (like "E799")
        let equipmentNumericId = equipmentId;

        if (isNaN(equipmentId)) {
          // It's an equipment_id, need to get the numeric id
          const equipmentIdQuery = `
            SELECT id
            FROM longtermhire_equipment_item
            WHERE equipment_id = ?
            LIMIT 1
          `;
          const equipmentIdResult = await sdk.rawQuery(equipmentIdQuery, [
            equipmentId,
          ]);
          if (equipmentIdResult && equipmentIdResult.length > 0) {
            equipmentNumericId = equipmentIdResult[0].id;
          } else {
            return res.status(404).json({
              error: true,
              message: "Equipment not found",
            });
          }
        }

        // Get user's company_id from company_member table (same logic as getEquipment)
        const companyQuery = `
          SELECT company_id
          FROM longtermhire_company_member
          WHERE user_id = ?
          LIMIT 1
        `;
        const companyResult = await sdk.rawQuery(companyQuery, [req.user_id]);

        let companyId = null;
        let hasAccess = false;

        if (companyResult && companyResult.length > 0) {
          // User is a company member - check if ANY member of their company has access
          companyId = companyResult[0].company_id;
          console.log(
            `👥 User is member of company ${companyId}, checking company equipment access`
          );

          const accessQuery = `
            SELECT ce.id
            FROM longtermhire_client_equipment ce
            JOIN longtermhire_company_member cm ON ce.client_user_id = cm.user_id
            WHERE cm.company_id = ? AND ce.equipment_id = ?
            LIMIT 1
          `;
          const accessResult = await sdk.rawQuery(accessQuery, [
            companyId,
            equipmentNumericId,
          ]);
          hasAccess = accessResult && accessResult.length > 0;
        } else {
          // User is not a company member - check direct assignment
          console.log(
            `👤 User is not a company member, checking direct equipment access`
          );
          const accessQuery = `
            SELECT ce.id
            FROM longtermhire_client_equipment ce
            WHERE ce.client_user_id = ? AND ce.equipment_id = ?
            LIMIT 1
          `;
          const accessResult = await sdk.rawQuery(accessQuery, [
            req.user_id,
            equipmentNumericId,
          ]);
          hasAccess = accessResult && accessResult.length > 0;

          // If user has direct access, try to get their company_id from client table (V1 fallback)
          if (hasAccess) {
            const clientQuery = `
              SELECT company_id
              FROM longtermhire_client
              WHERE user_id = ?
              LIMIT 1
            `;
            const clientResult = await sdk.rawQuery(clientQuery, [req.user_id]);
            if (clientResult && clientResult.length > 0) {
              companyId = clientResult[0].company_id;
            }
          }
        }

        console.log(`🔍 Access check result:`, { hasAccess, companyId });

        if (!hasAccess) {
          return res.status(404).json({
            error: true,
            message: "Equipment not found for this user or their company",
          });
        }

        // Get company owner info for defaults (if company_id exists)
        let defaultCompanyName = "Long Term Hire";
        let defaultCompanyEmail = "";
        let defaultCompanyAddress = "";
        let defaultCompanyLogo = null;

        if (companyId) {
          console.log(`🏢 User's company_id: ${companyId}`);

          // Try to get company owner from company_member table (V2 - preferred)
          const ownerQuery = `
            SELECT cm.member_name, cm.member_email, c.company_name, c.company_address, c.company_logo
            FROM longtermhire_company_member cm
            JOIN longtermhire_company c ON cm.company_id = c.id
            WHERE cm.company_id = ? AND cm.role = 'Company Owner'
            LIMIT 1
          `;
          const ownerResult = await sdk.rawQuery(ownerQuery, [companyId]);

          if (ownerResult && ownerResult.length > 0) {
            defaultCompanyName =
              ownerResult[0].company_name ||
              ownerResult[0].member_name ||
              "Long Term Hire";
            defaultCompanyEmail = ownerResult[0].member_email || "";
            defaultCompanyAddress = ownerResult[0].company_address || "";
            defaultCompanyLogo = ownerResult[0].company_logo || null;
            console.log(
              `👤 Found company owner: ${defaultCompanyName} (${defaultCompanyEmail})`
            );
          } else {
            // Fallback to company table with owner_user_id (V1)
            const companyQuery = `
              SELECT c.company_name, c.company_address, c.company_logo, u.email
              FROM longtermhire_company c
              LEFT JOIN longtermhire_user u ON c.owner_user_id = u.id
              WHERE c.id = ?
              LIMIT 1
            `;
            const companyResult = await sdk.rawQuery(companyQuery, [companyId]);

            if (companyResult && companyResult.length > 0) {
              defaultCompanyName =
                companyResult[0].company_name || "Long Term Hire";
              defaultCompanyEmail = companyResult[0].email || "";
              defaultCompanyAddress = companyResult[0].company_address || "";
              defaultCompanyLogo = companyResult[0].company_logo || null;
              console.log(
                `🏢 Found company info: ${defaultCompanyName} (${defaultCompanyEmail})`
              );
            }
          }
        }

        // If no company_id found, return default config with owner info if available
        if (!companyId) {
          console.log(`⚠️ No company_id found, returning defaults`);
          return res.status(200).json({
            error: false,
            data: {
              company_name: defaultCompanyName,
              company_email: defaultCompanyEmail,
              company_address: defaultCompanyAddress,
              company_logo: defaultCompanyLogo,
              quote_expires_after: 7,
              produce_quote_for: 12,
              gst_percentage: 15,
              terms_of_hire:
                "Standard Long Term Hire Terms & Conditions apply.",
              is_default: true,
            },
          });
        }

        // Get quote configuration for this company
        const quoteQuery = `
                    SELECT 
                        q.id,
                        q.quote_id,
                        q.company_name,
                        q.company_email,
                        q.company_address,
                        q.company_logo,
                        q.quote_expires_after,
                        q.produce_quote_for,
                        q.gst_percentage,
                        q.terms_of_hire,
                        q.status,
                        q.created_at
                    FROM longtermhire_quote q
                    WHERE q.company_id = ? AND q.status = 'Active'
                    ORDER BY q.created_at DESC
                    LIMIT 1
                `;

        console.log(`🔍 Fetching quote for company_id: ${companyId}`);
        const quoteConfig = await sdk.rawQuery(quoteQuery, [companyId]);
        console.log(`📋 Quote config result:`, quoteConfig);

        if (!quoteConfig || quoteConfig.length === 0) {
          console.log(
            `⚠️ No quote found for company ${companyId}, returning defaults with company owner info`
          );
          // Return default configuration with company owner info if no quote found
          return res.status(200).json({
            error: false,
            data: {
              company_name: defaultCompanyName,
              company_email: defaultCompanyEmail,
              company_address: defaultCompanyAddress,
              company_logo: defaultCompanyLogo,
              quote_expires_after: 7,
              produce_quote_for: 12,
              gst_percentage: 15,
              terms_of_hire:
                "Standard Long Term Hire Terms & Conditions apply.",
              is_default: true,
            },
          });
        }

        return res.status(200).json({
          error: false,
          data: {
            ...quoteConfig[0],
            is_default: false,
          },
        });
      } catch (error) {
        console.error("Get quote config error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get specification files for a specific equipment
  app.get(
    "/v1/api/longtermhire/client/equipment/:equipmentId/specs",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { equipmentId } = req.params;

        console.log(
          `🔍 Getting specs for equipment ${equipmentId}, user ${req.user_id}`
        );

        // Verify user has access to this equipment
        // First, get the equipment's numeric id if equipmentId is an equipment_id (like "E799")
        let equipmentNumericId = equipmentId;
        let equipmentData = null;

        if (isNaN(equipmentId)) {
          // It's an equipment_id, need to get the numeric id
          const equipmentIdQuery = `
            SELECT id, equipment_id
            FROM longtermhire_equipment_item 
            WHERE equipment_id = ?
            LIMIT 1
          `;
          const equipmentIdResult = await sdk.rawQuery(equipmentIdQuery, [
            equipmentId,
          ]);
          if (equipmentIdResult && equipmentIdResult.length > 0) {
            equipmentNumericId = equipmentIdResult[0].id;
            equipmentData = equipmentIdResult[0];
          } else {
            return res.status(404).json({
              error: true,
              message: "Equipment not found",
            });
          }
        } else {
          // Get equipment data for numeric id
          const equipmentIdQuery = `
            SELECT id, equipment_id
            FROM longtermhire_equipment_item 
            WHERE id = ?
            LIMIT 1
          `;
          const equipmentIdResult = await sdk.rawQuery(equipmentIdQuery, [
            equipmentId,
          ]);
          if (equipmentIdResult && equipmentIdResult.length > 0) {
            equipmentData = equipmentIdResult[0];
          }
        }

        // Check if user is a company member first (V2 approach)
        const companyQuery = `
          SELECT company_id
          FROM longtermhire_company_member
          WHERE user_id = ?
          LIMIT 1
        `;
        const companyResult = await sdk.rawQuery(companyQuery, [req.user_id]);

        let hasAccess = false;

        if (companyResult && companyResult.length > 0) {
          // User is a company member - check if any company member has access to this equipment
          const companyId = companyResult[0].company_id;
          const companyAccessQuery = `
            SELECT ce.id
            FROM longtermhire_client_equipment ce
            JOIN longtermhire_company_member cm ON ce.client_user_id = cm.user_id
            WHERE cm.company_id = ? AND ce.equipment_id = ?
            LIMIT 1
          `;
          const companyAccessResult = await sdk.rawQuery(companyAccessQuery, [
            companyId,
            equipmentNumericId,
          ]);
          hasAccess = companyAccessResult && companyAccessResult.length > 0;
        } else {
          // User is not a company member - check direct assignment (V1 approach)
          const accessQuery = `
            SELECT ce.id
            FROM longtermhire_client_equipment ce
            WHERE ce.client_user_id = ? AND ce.equipment_id = ?
            LIMIT 1
          `;
          const accessResult = await sdk.rawQuery(accessQuery, [
            req.user_id,
            equipmentNumericId,
          ]);
          hasAccess = accessResult && accessResult.length > 0;
        }

        if (!hasAccess) {
          return res.status(404).json({
            error: true,
            message: "Equipment not found for this user",
          });
        }

        // Get specs files - use the equipment data we already have or query by the correct identifier
        let specsQuery;
        let queryParams;

        // Use equipmentNumericId (which we already validated) to get specs
        specsQuery = `
          SELECT 
            e.id,
            e.equipment_id,
            e.equipment_name,
            e.specs_files
          FROM longtermhire_equipment_item e
          WHERE e.id = ?
          LIMIT 1
        `;
        queryParams = [equipmentNumericId];

        const specsResult = await sdk.rawQuery(specsQuery, queryParams);

        if (!specsResult || specsResult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Equipment not found",
          });
        }

        const equipment = specsResult[0];
        let specsFiles = [];

        // Parse specs_files if it exists
        if (equipment.specs_files) {
          try {
            specsFiles =
              typeof equipment.specs_files === "string"
                ? JSON.parse(equipment.specs_files)
                : equipment.specs_files;
          } catch (e) {
            console.error("Error parsing specs_files:", e);
            specsFiles = [];
          }
        }

        // Return success even if no specs files - frontend will show "No documents available"
        return res.status(200).json({
          error: false,
          data: {
            equipment_id: equipment.equipment_id || equipment.id,
            equipment_name: equipment.equipment_name,
            specs_files: specsFiles || [], // Always return array, even if empty
          },
          message:
            specsFiles.length === 0
              ? "No specification documents available for this equipment"
              : "Specifications retrieved successfully",
        });
      } catch (error) {
        console.error("Get specs error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );
};
