const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const MailService = require("../../../baas/services/MailService");
const bcrypt = require("bcryptjs");

module.exports = function (app) {
  console.log("Loading client routes...");
  const config = app.get("configuration");
  const mailService = new MailService(config);

  // Test route
  app.get("/v1/api/longtermhire/test", (req, res) => {
    res.json({ message: "longtermhire routes working!" });
  });

  // Test invite client route without middleware
  app.post(
    "/v1/api/longtermhire/super_admin/invite-client-test",
    async (req, res) => {
      console.log("TEST ROUTE: invite-client-test called");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      res.json({
        message: "Test route working!",
        body: req.body,
      });
    }
  );

  // Client invitation API
  app.post(
    "/v1/api/longtermhire/super_admin/invite-client",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log(
          "POST /v1/api/longtermhire/super_admin/invite-client called"
        );
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        console.log("Request headers:", JSON.stringify(req.headers, null, 2));
        console.log("User ID from token:", req.user_id);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");
        console.log("SDK initialized with project ID: longtermhire");

        const {
          client_name,
          company_name,
          email,
          phone,
          address,
          street,
          suburb,
          state,
          postcode,
          abn,
          contact_position,
          payment_terms,
          send_invite,
          username: providedUsername,
          password: providedPassword,
          equipment,
          pricing,
        } = req.body;

        if (!client_name || !company_name || !email) {
          console.log("Validation failed - missing required fields");
          return res.status(400).json({
            error: true,
            message: "Client name, company name, and email are required",
          });
        }

        // Check if email already exists ANYWHERE in the database (app-wide uniqueness)
        // Check in longtermhire_user table
        const existingUserCheck = await sdk.rawQuery(
          `SELECT id, email FROM longtermhire_user WHERE email = ? LIMIT 1`,
          [email]
        );

        if (existingUserCheck && existingUserCheck.length > 0) {
          return res.status(400).json({
            error: true,
            message: `This email (${email}) is already registered in the system. Each email can only be used once.`,
          });
        }

        // Check in longtermhire_company_member table
        const existingMemberCheck = await sdk.rawQuery(
          `SELECT cm.id, cm.company_id, c.company_name 
           FROM longtermhire_company_member cm
           JOIN longtermhire_company c ON c.id = cm.company_id
           WHERE cm.member_email = ? LIMIT 1`,
          [email]
        );

        if (existingMemberCheck && existingMemberCheck.length > 0) {
          return res.status(400).json({
            error: true,
            message: `This email (${email}) is already a team member of ${existingMemberCheck[0].company_name}. Each email can only be used once.`,
          });
        }

        // Check in longtermhire_client table
        const existingClientCheck = await sdk.rawQuery(
          `SELECT c.id, c.client_name, c.company_name 
           FROM longtermhire_client c
           JOIN longtermhire_user u ON c.user_id = u.id
           WHERE u.email = ? LIMIT 1`,
          [email]
        );

        if (existingClientCheck && existingClientCheck.length > 0) {
          return res.status(400).json({
            error: true,
            message: `This email (${email}) is already registered as a client (${existingClientCheck[0].client_name}). Each email can only be used once.`,
          });
        }

        console.log("Email validation passed - email is unique");
        console.log("Validation passed, generating credentials...");
        console.log("Equipment data received:", equipment);
        console.log("Pricing data received:", pricing);

        // Generate username and password
        const username =
          providedUsername || email.split("@")[0] + Math.random().toString(36).substring(2, 6);
        const plainPassword = providedPassword || Math.random().toString(36).substring(2, 10);

        // Hash the password for database storage
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        console.log("Using username:", username);
        console.log("Using password:", plainPassword);
        console.log("Password hashed for database storage");

        // Create user account in database using raw SQL
        console.log("About to insert user with raw SQL...");
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        const userInsertSQL = `
          INSERT INTO longtermhire_user (email, password, role_id, status, verify, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        console.log("User insert SQL:", userInsertSQL);
        console.log("User insert values:", [
          email,
          hashedPassword,
          "member",
          1,
          1,
          currentTime,
          currentTime,
        ]);

        const userResult = await sdk.rawQuery(userInsertSQL, [
          email,
          hashedPassword,
          "member",
          1,
          1,
          currentTime,
          currentTime,
        ]);
        console.log("User insert completed!");
        console.log("User insert result:", JSON.stringify(userResult, null, 2));

        const userId = userResult.insertId || userResult.id;

        // Create company for the new client
        console.log("About to create company with raw SQL...");
        const companyInsertSQL = `
          INSERT INTO longtermhire_company (company_name, owner_user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `;

        console.log("Company insert SQL:", companyInsertSQL);
        console.log("Company insert values:", [
          company_name,
          userId,
          currentTime,
          currentTime,
        ]);

        const companyResult = await sdk.rawQuery(companyInsertSQL, [
          company_name,
          userId,
          currentTime,
          currentTime,
        ]);

        const companyId = companyResult.insertId || companyResult.id;
        console.log("Company created with ID:", companyId);

        // Create company member entry for the owner with "Company Owner" role
        console.log("Creating company member entry for owner...");
        const companyMemberInsertSQL = `
          INSERT INTO longtermhire_company_member (company_id, user_id, member_name, member_email, member_phone, role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await sdk.rawQuery(companyMemberInsertSQL, [
          companyId,
          userId,
          client_name,
          email,
          phone || null,
          "Company Owner",
          currentTime,
          currentTime,
        ]);
        console.log("✅ Company member entry created with Company Owner role");

        // Create client profile in database using raw SQL
        console.log("About to insert client with raw SQL...");

        const clientInsertSQL = `
          INSERT INTO longtermhire_client (user_id, client_name, company_name, company_id, phone, address, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        console.log("Client insert SQL:", clientInsertSQL);
        console.log("Client insert values:", [
          userId,
          client_name,
          company_name,
          companyId,
          phone || null,
          address || null,
          currentTime,
          currentTime,
        ]);

        const clientResult = await sdk.rawQuery(clientInsertSQL, [
          userId,
          client_name,
          company_name,
          companyId,
          phone || null,
          address || null,
          currentTime,
          currentTime,
        ]);
        console.log("Client insert completed!");
        console.log(
          "Client insert result:",
          JSON.stringify(clientResult, null, 2)
        );

        // Handle equipment assignments if provided
        if (equipment && Array.isArray(equipment) && equipment.length > 0) {
          console.log("🔧 Assigning equipment to client:", equipment);
          try {
            for (const equipmentId of equipment) {
              const equipmentAssignSQL = `
                INSERT INTO longtermhire_client_equipment (client_user_id, equipment_id, assigned_by, created_at)
                VALUES (?, ?, ?, ?)
              `;
              await sdk.rawQuery(equipmentAssignSQL, [
                userId,
                equipmentId,
                req.user_id, // Use the current admin user ID
                currentTime,
              ]);
            }
            console.log("✅ Equipment assignments completed");
          } catch (equipmentError) {
            console.error("❌ Error assigning equipment:", equipmentError);
            // Continue with client creation even if equipment assignment fails
          }
        }

        // Handle pricing assignment if provided
        if (pricing) {
          console.log("💰 Assigning pricing to client:", pricing);
          try {
            const pricingAssignSQL = `
              INSERT INTO longtermhire_client_pricing (client_user_id, pricing_package_id, assigned_by, created_at)
              VALUES (?, ?, ?, ?)
            `;
            await sdk.rawQuery(pricingAssignSQL, [
              userId,
              pricing,
              req.user_id, // Use the current admin user ID
              currentTime,
            ]);
            console.log("✅ Pricing assignment completed");
          } catch (pricingError) {
            console.error("❌ Error assigning pricing:", pricingError);
            // Continue with client creation even if pricing assignment fails
          }
        }

        // --- Auto-create a default quote for the new client ---
        console.log("📝 Auto-creating default quote for client...");
        try {
          // 1. Get Admin Company Settings for default values
          const adminSettingsSQL = `SELECT * FROM longtermhire_company_settings LIMIT 1`;
          const adminSettings = await sdk.rawQuery(adminSettingsSQL);
          const settings = adminSettings && adminSettings.length > 0 ? adminSettings[0] : null;

          // 2. Generate Next Quote ID
          const QuoteModel = require("../models/quote");
          const quoteModel = new QuoteModel(sdk);
          const quoteId = await quoteModel.generateQuoteId();

          // 3. Insert Quote
          const quoteInsertSQL = `
            INSERT INTO longtermhire_quote (
              quote_id, company_id, client_user_id, company_name, company_address, 
              company_email, company_logo, quote_expires_after, produce_quote_for, 
              gst_percentage, terms_of_hire, status, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          // Use admin company logo if available, else null (frontend will handle fallback to longtermhire logo if needed)
          // Actually, let's explicitly set the default logo if not in settings as per user request
          const defaultLogo = "/login-logo.png";
          const companyLogo = settings?.company_logo || defaultLogo;

          await sdk.rawQuery(quoteInsertSQL, [
            quoteId,
            companyId,
            userId,
            company_name,
            address || "",
            email,
            companyLogo,
            7, // Default: quote_expires_after
            12, // Default: produce_quote_for
            10.00, // Default: gst_percentage
            null, // terms_of_hire
            'Active',
            req.user_id, // created_by (admin)
            currentTime,
            currentTime
          ]);
          console.log(`✅ Default quote ${quoteId} created successfully`);
        } catch (quoteError) {
          console.error("❌ Error auto-creating quote:", quoteError);
          // Don't fail the whole request if quote creation fails
        }

        // Send invitation email to client
        console.log("📧 Sending invitation email to:", email);

        try {
          const loginUrl = "https://longtermhire.com/client/login";

          // Create HTML email template
          const htmlContent = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
              <div style="background-color: #1F1F20; padding: 30px; border-radius: 8px; border: 2px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                
                <!-- Header with Logo -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333333;">
                  <img src="https://longtermhire.com/login-logo.png" 
                       alt="" 
                       style="width: 240px; height: 135px; margin-bottom: 15px;">
                  <h1 style="color: #E5E5E5; margin: 0; font-size: 28px; font-weight: 400;">Welcome to Long Term Hire</h1>
                  <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">Your equipment rental portal is ready!</p>
                </div>

                <!-- Welcome Message -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 20px; font-weight: 400;">👋 Hello ${client_name}!</h3>
                  <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                    Welcome to <strong>Long Term Hire</strong>! Your account has been created for <strong>${company_name}</strong> 
                    and you now have access to our comprehensive equipment rental platform.
                  </p>
                </div>

                <!-- Login Credentials -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">🔐 Your Login Credentials</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #E5E5E5; font-weight: 400; font-size: 14px;">Email:</td>
                      <td style="padding: 12px 0; color: #E5E5E5; font-family: monospace; background: #292A2B; padding: 8px 12px; border-radius: 4px; border: 1px solid #444444;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #E5E5E5; font-weight: 400; font-size: 14px;">Password:</td>
                      <td style="padding: 12px 0; color: #E5E5E5; font-family: monospace; background: #292A2B; padding: 8px 12px; border-radius: 4px; border: 1px solid #444444;">${plainPassword}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #E5E5E5; font-weight: 400; font-size: 14px;">Login URL:</td>
                      <td style="padding: 12px 0;"><a href="${loginUrl}" style="color: #FDCE06; text-decoration: none; font-size: 14px;">${loginUrl}</a></td>
                    </tr>
                  </table>
                </div>

                <!-- Login Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}"
                     style="background: #FDCE06; color: #1F1F20; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #FDCE06;">
                    🚀 Login to Your Account
                  </a>
                </div>

              
                <!-- Footer -->
                <div style="border-top: 1px solid #333333; padding-top: 20px; margin-top: 30px; text-align: center;">
                  <p style="color: #ADAEBC; font-size: 14px; margin: 0;">
                    Need assistance? Contact our support team <b>admin@longtermhire.com</b>.<br>
                    <small style="color: #666666;">Invitation sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small>
                  </p>
                </div>
              </div>
            </div>
          `;

          // Store the structured address parts
          try {
            await sdk.rawQuery(
              'UPDATE longtermhire_client SET street = ?, suburb = ?, state = ?, postcode = ?, abn = ?, contact_position = ?, payment_terms = ? WHERE user_id = ?',
              [street || null, suburb || null, state || null, postcode || null, abn || null, contact_position || null, payment_terms || null, userId]
            );
          } catch (addrErr) {
            console.error('Address parts not saved:', addrErr.message);
          }

          // Only email when the admin explicitly chooses to invite
          const shouldInvite = send_invite === true || send_invite === 'true';
          let emailResult = { error: false, skipped: true };
          if (shouldInvite) {
            emailResult = await mailService.send(
              config.mail?.from_mail || "noreply@longtermhire.com",
              email,
              `🎉 Welcome to Long Term Hire - Your Account is Ready!`,
              htmlContent
            );
            const invitedTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await sdk.rawQuery('UPDATE longtermhire_client SET invited_at = ? WHERE user_id = ?', [invitedTime, userId]);
            console.log("✅ Invitation email sent successfully:", emailResult);
          } else {
            console.log("Client created without sending an invitation");
          }

          const responseData = {
            error: false,
            message: "Client invited successfully! Invitation email sent.",
            data: {
              user_id: userId,
              username: username,
              email: email,
              password: plainPassword, // Include password in response for display (also sent via email)
              email_sent: !emailResult.error,
              login_url: loginUrl,
              equipment_assigned:
                equipment && Array.isArray(equipment) ? equipment.length : 0,
              pricing_assigned: pricing ? true : false,
            },
          };

          console.log("Response data:", JSON.stringify(responseData, null, 2));
          return res.status(200).json(responseData);
        } catch (emailError) {
          console.error("❌ Failed to send invitation email:", emailError);

          // Still return success for user creation, but note email failure
          const responseData = {
            error: false,
            message:
              "Client invited successfully, but invitation email failed to send. Please contact the client manually.",
            data: {
              user_id: userId,
              username: username,
              email: email,
              email_sent: false,
              email_error: emailError.message,
              login_url: "https://longtermhire.com/client/login",
              equipment_assigned:
                equipment && Array.isArray(equipment) ? equipment.length : 0,
              pricing_assigned: pricing ? true : false,
            },
          };

          console.log(
            "Response data (email failed):",
            JSON.stringify(responseData, null, 2)
          );
          return res.status(200).json(responseData);
        }
      } catch (error) {
        console.error("Invite client error:", error);
        console.error("Error stack:", error.stack);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return res.status(500).json({
          error: true,
          message: error.message,
          details: error.stack,
        });
      }
    }
  );

  // Get all clients with email, pagination and search
  app.get(
    "/v1/api/longtermhire/super_admin/clients",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log("GET /v1/api/longtermhire/super_admin/clients called");
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Extract query parameters for pagination and search
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const clientId = req.query.clientId || "";
        const clientName = req.query.clientName || "";
        const companyName = req.query.companyName || "";
        const offset = (page - 1) * limit;

        // Build search conditions
        let searchConditions = [];
        let searchParams = [];

        if (clientId) {
          searchConditions.push("c.id = ?");
          searchParams.push(clientId);
        }
        if (clientName) {
          searchConditions.push("c.client_name LIKE ?");
          searchParams.push(`%${clientName}%`);
        }
        if (companyName) {
          searchConditions.push("c.company_name LIKE ?");
          searchParams.push(`%${companyName}%`);
        }

        const whereClause =
          searchConditions.length > 0
            ? `WHERE ${searchConditions.join(" AND ")}`
            : "";

        // Get clients with user email, pricing information, and custom discount flag
        const clientsQuery = `
        SELECT
          c.id,
          c.user_id,
          c.client_name,
          c.company_name,
          c.company_id,
          c.phone,
          c.address,
          c.street,
          c.suburb,
          c.state,
          c.postcode,
          c.abn,
          c.contact_position,
          c.payment_terms,
          c.invited_at,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM longtermhire_client_equipment ce WHERE ce.client_user_id = c.user_id) as equipment_count,
          (SELECT COUNT(*) FROM longtermhire_quote q WHERE q.client_user_id = c.user_id AND q.equipment_name IS NULL AND q.terms_of_hire IS NOT NULL AND q.terms_of_hire <> '') as has_terms,
          (SELECT COUNT(*) FROM longtermhire_company co WHERE co.id = c.company_id AND co.sticky_ad_text IS NOT NULL AND co.sticky_ad_text <> '') as has_welcome,
          u.email,
          cp.pricing_package_id,
          pp.name as pricing_package_name,
          CASE WHEN custom_discounts.client_user_id IS NOT NULL THEN 1 ELSE 0 END as has_custom_discounts
        FROM longtermhire_client c
        LEFT JOIN longtermhire_user u ON c.user_id = u.id
        LEFT JOIN longtermhire_client_pricing cp ON c.user_id = cp.client_user_id
        LEFT JOIN longtermhire_pricing_package pp ON cp.pricing_package_id = pp.id
        LEFT JOIN (
          SELECT DISTINCT client_user_id
          FROM longtermhire_client_equipment
          -- Count a discount the admin can actually set. custom_discount_type
          -- and custom_discount_value are never written by anything, so the
          -- Pricing item could never be satisfied.
          WHERE (discount IS NOT NULL AND discount <> 0)
          OR (compounding_discount IS NOT NULL AND compounding_discount <> 0)
        ) custom_discounts ON c.user_id = custom_discounts.client_user_id
        ${whereClause}
        ORDER BY c.id DESC
        LIMIT ? OFFSET ?
      `;

        // Get total count for pagination
        const countQuery = `
        SELECT COUNT(*) as total
        FROM longtermhire_client c
        LEFT JOIN longtermhire_user u ON c.user_id = u.id
        ${whereClause}
      `;

        const clients = await sdk.rawQuery(clientsQuery, [
          ...searchParams,
          limit,
          offset,
        ]);

        // Batch fetch equipment assignments for all clients in the result set
        if (clients.length > 0) {
          const userIds = clients.map((c) => c.user_id);
          const placeholders = userIds.map(() => "?").join(",");
          const equipmentAssignmentsSQL = `
            SELECT ce.client_user_id, ce.equipment_id, ei.equipment_name, ei.category_name, ei.availability
            FROM longtermhire_client_equipment ce
            JOIN longtermhire_equipment_item ei ON ce.equipment_id = ei.id
            WHERE ce.client_user_id IN (${placeholders})
          `;
          const allAssignments = await sdk.rawQuery(
            equipmentAssignmentsSQL,
            userIds
          );

          // Map assignments back to clients
          clients.forEach((client) => {
            client.equipment = allAssignments
              .filter((a) => a.client_user_id === client.user_id)
              .map((a) => ({
                id: a.equipment_id,
                equipment_id: a.equipment_id,
                equipment_name: a.equipment_name,
                category_name: a.category_name,
                availability: a.availability,
              }));
          });
        }

        const countResult = await sdk.rawQuery(countQuery, searchParams);
        const total = countResult[0]?.total || 0;

        return res.status(200).json({
          error: false,
          data: clients,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        });
      } catch (error) {
        console.error("Get clients error:", error);
        console.error("Error details:", error.stack);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Update client
  app.put(
    "/v1/api/longtermhire/super_admin/clients/:id",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log("PUT /v1/api/longtermhire/super_admin/clients/:id called");
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { client_name, company_name, phone, address, email, street, suburb, state, postcode, abn, contact_position, payment_terms } = req.body;
        const clientId = req.params.id;

        // Get client to find user_id
        const clientQuery =
          "SELECT user_id FROM longtermhire_client WHERE id = ?";
        const clientResult = await sdk.rawQuery(clientQuery, [clientId]);

        if (!clientResult || clientResult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        const userId = clientResult[0].user_id;
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // Update client table
        const updateClientSQL = `
          UPDATE longtermhire_client
          SET client_name = ?, company_name = ?, phone = ?, address = ?, street = ?, suburb = ?, state = ?, postcode = ?, abn = ?, contact_position = ?, payment_terms = ?, updated_at = ?
          WHERE id = ?
        `;
        await sdk.rawQuery(updateClientSQL, [
          client_name,
          company_name,
          phone,
          address,
          street || null,
          suburb || null,
          state || null,
          postcode || null,
          abn || null,
          contact_position || null,
          payment_terms || null,
          currentTime,
          clientId,
        ]);

        // Update user email if provided
        if (email) {
          const updateUserSQL = `
            UPDATE longtermhire_user
            SET email = ?, updated_at = ?
            WHERE id = ?
          `;
          await sdk.rawQuery(updateUserSQL, [email, currentTime, userId]);
        }

        return res.status(200).json({
          error: false,
          message: "Client updated successfully",
        });
      } catch (error) {
        console.error("Update client error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Delete client
  app.delete(
    "/v1/api/longtermhire/super_admin/clients/:id",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log(
          "DELETE /v1/api/longtermhire/super_admin/clients/:id called"
        );
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const clientId = req.params.id;

        // Get client to find user_id
        const clientQuery =
          "SELECT user_id FROM longtermhire_client WHERE id = ?";
        const clientResult = await sdk.rawQuery(clientQuery, [clientId]);

        if (!clientResult || clientResult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        const userId = clientResult[0].user_id;

        // Delete client equipment assignments
        await sdk.rawQuery(
          "DELETE FROM longtermhire_client_equipment WHERE client_user_id = ?",
          [userId]
        );

        // Delete client pricing assignments
        await sdk.rawQuery(
          "DELETE FROM longtermhire_client_pricing WHERE client_user_id = ?",
          [userId]
        );

        // Delete client profile
        await sdk.rawQuery("DELETE FROM longtermhire_client WHERE id = ?", [
          clientId,
        ]);

        // Delete user account
        await sdk.rawQuery("DELETE FROM longtermhire_user WHERE id = ?", [
          userId,
        ]);

        return res.status(200).json({
          error: false,
          message: "Client deleted successfully",
        });
      } catch (error) {
        console.error("Delete client error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Get client equipment assignments
  app.get(
    "/v1/api/longtermhire/super_admin/client-equipment/:clientUserId",
    async (req, res) => {
      try {
        console.log(
          "GET /v1/api/longtermhire/super_admin/client-equipment/:clientUserId called"
        );

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { clientUserId } = req.params;

        // Get equipment assignments with equipment details
        const assignmentsSQL = `
          SELECT ce.equipment_id, ei.equipment_name, ei.category_name, ei.availability
          FROM longtermhire_client_equipment ce
          JOIN longtermhire_equipment_item ei ON ce.equipment_id = ei.id
          WHERE ce.client_user_id = ?
        `;

        const assignments = await sdk.rawQuery(assignmentsSQL, [clientUserId]);
        console.log(
          `Found ${assignments.length} equipment assignments for client ${clientUserId}`
        );

        return res.status(200).json({
          error: false,
          data: assignments,
        });
      } catch (error) {
        console.error("Get client equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Get client pricing assignment
  app.get(
    "/v1/api/longtermhire/super_admin/client-pricing/:clientUserId",
    async (req, res) => {
      try {
        console.log(
          "GET /v1/api/longtermhire/super_admin/client-pricing/:clientUserId called"
        );

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { clientUserId } = req.params;

        // Get pricing assignment with package details
        const pricingSQL = `
          SELECT cp.pricing_package_id, pp.name as package_name, pp.description, pp.discount_type, pp.discount_value
          FROM longtermhire_client_pricing cp
          JOIN longtermhire_pricing_package pp ON cp.pricing_package_id = pp.id
          WHERE cp.client_user_id = ?
          LIMIT 1
        `;

        const pricingResult = await sdk.rawQuery(pricingSQL, [clientUserId]);
        const pricingData = pricingResult.length > 0 ? pricingResult[0] : null;

        console.log(
          `Found pricing assignment for client ${clientUserId}:`,
          pricingData
        );

        return res.status(200).json({
          error: false,
          data: pricingData,
        });
      } catch (error) {
        console.error("Get client pricing error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Assign equipment to client
  app.post(
    "/v1/api/longtermhire/super_admin/assign-equipment",
    async (req, res) => {
      try {
        console.log(
          "POST /v1/api/longtermhire/super_admin/assign-equipment called"
        );
        console.log("Assignment data:", req.body);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { client_user_id, equipment_ids } = req.body;
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // First, remove existing assignments for this client
        const deleteSQL = `DELETE FROM longtermhire_client_equipment WHERE client_user_id = ?`;
        await sdk.rawQuery(deleteSQL, [client_user_id]);
        console.log(
          "Removed existing equipment assignments for client:",
          client_user_id
        );

        // Then insert new assignments
        if (equipment_ids && equipment_ids.length > 0) {
          for (const equipmentId of equipment_ids) {
            const insertSQL = `
              INSERT INTO longtermhire_client_equipment (client_user_id, equipment_id, assigned_by, created_at)
              VALUES (?, ?, ?, ?)
            `;
            await sdk.rawQuery(insertSQL, [
              client_user_id,
              equipmentId,
              2, // Use current admin user ID 2
              currentTime,
            ]);
            console.log(
              `Assigned equipment ${equipmentId} to client ${client_user_id}`
            );
          }
        }

        return res.status(200).json({
          error: false,
          message: "Equipment assigned successfully",
        });
      } catch (error) {
        console.error("Assign equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Assign pricing to client
  app.post(
    "/v1/api/longtermhire/super_admin/assign-pricing",
    async (req, res) => {
      try {
        console.log(
          "POST /v1/api/longtermhire/super_admin/assign-pricing called"
        );
        console.log("Pricing assignment data:", req.body);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { client_user_id, pricing_package_id, custom_discount } =
          req.body;
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // First, remove existing pricing assignment for this client
        const deleteSQL = `DELETE FROM longtermhire_client_pricing WHERE client_user_id = ?`;
        await sdk.rawQuery(deleteSQL, [client_user_id]);
        console.log(
          "Removed existing pricing assignment for client:",
          client_user_id
        );

        // Then insert new pricing assignment
        if (pricing_package_id) {
          if (
            typeof pricing_package_id === "string" &&
            pricing_package_id.startsWith("custom_")
          ) {
            // Handle custom discount
            const insertSQL = `
              INSERT INTO longtermhire_client_pricing (client_user_id, pricing_package_id, custom_discount_type, custom_discount_value, assigned_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            await sdk.rawQuery(insertSQL, [
              client_user_id,
              null, // Set pricing_package_id to NULL for custom discounts
              custom_discount?.discountType || "percentage",
              custom_discount?.discountValue || 0,
              2, // Use current admin user ID 2
              currentTime,
            ]);
            console.log(
              `Assigned custom discount to client ${client_user_id}: ${custom_discount?.discountValue
              }${custom_discount?.discountType === "percentage" ? "%" : "$"
              } off`
            );
          } else {
            // Handle regular pricing package
            const insertSQL = `
              INSERT INTO longtermhire_client_pricing (client_user_id, pricing_package_id, assigned_by, created_at)
              VALUES (?, ?, ?, ?)
            `;
            await sdk.rawQuery(insertSQL, [
              client_user_id,
              pricing_package_id,
              2, // Use current admin user ID 2
              currentTime,
            ]);
            console.log(
              `Assigned pricing package ${pricing_package_id} to client ${client_user_id}`
            );
          }
        }

        return res.status(200).json({
          error: false,
          message: "Pricing assigned successfully",
        });
      } catch (error) {
        console.error("Assign pricing error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Remove pricing assignment from client
  app.delete(
    "/v1/api/longtermhire/super_admin/remove-pricing/:clientUserId",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log(
          "DELETE /v1/api/longtermhire/super_admin/remove-pricing/:clientUserId called"
        );
        console.log("Client user ID:", req.params.clientUserId);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { clientUserId } = req.params;

        // Check if client exists
        const clientExists = await sdk.findOne("client", {
          user_id: clientUserId,
        });

        if (!clientExists) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        // Remove pricing assignment
        const deleteSQL = `DELETE FROM longtermhire_client_pricing WHERE client_user_id = ?`;
        const result = await sdk.rawQuery(deleteSQL, [clientUserId]);

        console.log(
          `Removed pricing assignment for client: ${clientUserId}`,
          result
        );

        return res.status(200).json({
          error: false,
          message: "Pricing assignment removed successfully",
          data: {
            client_user_id: clientUserId,
            removed_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Remove pricing error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // ============================================================================
  // V2: Get CMS content for client frontend
  // ============================================================================
  // Public endpoint - no auth required
  // Returns CMS content and company info from admin profile
  app.get("/v1/api/longtermhire/client/cms-content", async (req, res) => {
    try {
      console.log("GET /v1/api/longtermhire/client/cms-content called");

      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      // Get admin user (user_id = 1) data
      const adminUser = await sdk.findOne("user", { id: 1 });

      if (!adminUser) {
        return res.status(404).json({
          error: true,
          message: "Admin profile not found",
        });
      }

      // Parse user data JSON
      const userData = JSON.parse(adminUser?.data ?? "{}");

      return res.status(200).json({
        error: false,
        data: {
          company_name: userData?.company_name || "",
          contact_info: userData?.contact_info || "",
          company_address: userData?.company_address || "",
          company_logo: userData?.company_logo || "",
          cms_content: userData?.cms_content || "",
        },
      });
    } catch (error) {
      console.error("Get CMS content error:", error);
      return res.status(500).json({
        error: true,
        message: error.message || "Internal server error",
      });
    }
  });

  // ============================================================================
  // V2: Get company settings for logged-in client
  // ============================================================================
  // Returns company-specific settings including ad_text for sticky note/banner
  app.get(
    "/v1/api/longtermhire/client/company-settings",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        console.log("GET /v1/api/longtermhire/client/company-settings called");
        console.log("User ID:", req.user_id);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get client's company information - check company_member table first (V2 structure)
        // Then fallback to longtermhire_client table (V1 structure)
        let clientData = null;

        // Try company_member table first (V2 - preferred)
        const companyMemberQuery = `
          SELECT cm.company_id, co.company_name, co.header_ad_text, co.sticky_ad_text
          FROM longtermhire_company_member cm
          LEFT JOIN longtermhire_company co ON cm.company_id = co.id
          WHERE cm.user_id = ?
          LIMIT 1
        `;

        const companyMemberResult = await sdk.rawQuery(companyMemberQuery, [
          req.user_id,
        ]);

        if (companyMemberResult && companyMemberResult.length > 0) {
          clientData = companyMemberResult[0];
        } else {
          // Fallback to longtermhire_client table (V1)
          const clientQuery = `
            SELECT c.company_name, c.company_id, co.header_ad_text, co.sticky_ad_text
            FROM longtermhire_client c
            LEFT JOIN longtermhire_company co ON c.company_id = co.id
            WHERE c.user_id = ?
            LIMIT 1
          `;

          const clientResult = await sdk.rawQuery(clientQuery, [req.user_id]);

          if (clientResult && clientResult.length > 0) {
            clientData = clientResult[0];
          }
        }

        if (!clientData) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        // Get company logo from admin settings
        const adminUser = await sdk.findOne("user", { id: 1 });
        const userData = JSON.parse(adminUser?.data ?? "{}");

        return res.status(200).json({
          error: false,
          data: {
            company_id: clientData.company_id,
            company_name: clientData.company_name,
            header_ad_text: clientData.header_ad_text || "",
            sticky_ad_text: clientData.sticky_ad_text || "",
            company_logo: userData?.company_logo || "",
          },
          message: "Company settings retrieved successfully",
        });
      } catch (error) {
        console.error("Get company settings error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  app.post('/v1/api/longtermhire/super_admin/resend-invitation/:userId', TokenMiddleware(), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { userId } = req.params;
      let clientResult = await sdk.rawQuery('SELECT c.client_name, c.company_name, u.email FROM longtermhire_client c JOIN longtermhire_user u ON u.id = c.user_id WHERE c.user_id = ? LIMIT 1', [userId]);
      if (!clientResult || clientResult.length === 0) {
        clientResult = await sdk.rawQuery('SELECT m.member_name AS client_name, co.company_name, u.email FROM longtermhire_company_member m JOIN longtermhire_company co ON co.id = m.company_id JOIN longtermhire_user u ON u.id = m.user_id WHERE m.user_id = ? LIMIT 1', [userId]);
      }
      if (!clientResult || clientResult.length === 0) return res.status(404).json({ error: true, message: 'User not found' });
      const { client_name, company_name, email } = clientResult[0];
      const newPassword = Math.random().toString(36).substring(2,10) + Math.random().toString(36).substring(2,6);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const currentTime = new Date().toISOString().slice(0,19).replace('T',' ');
      await sdk.rawQuery('UPDATE longtermhire_user SET password = ?, updated_at = ? WHERE id = ?', [hashedPassword, currentTime, userId]);
      const html = '<div><h2>Long Term Hire</h2><p>Hello ' + client_name + '</p><p>Email: ' + email + '</p><p>Password: ' + newPassword + '</p><a href="https://longtermhire.com/client/login">Login Now</a></div>';
      await mailService.send(config.mail && config.mail.from_mail ? config.mail.from_mail : 'noreply@longtermhire.com', email, 'Long Term Hire - Your Login Credentials', html);
      try { await sdk.rawQuery('UPDATE longtermhire_client SET invited_at = ? WHERE user_id = ?', [currentTime, userId]); } catch (e) { console.error('invited_at not recorded:', e.message); }
      return res.status(200).json({ error: false, message: 'Invitation resent to ' + email, data: { email: email, password: newPassword } });
    } catch (error) {
      console.error('Resend invitation error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });



  // Fetch latest Australian construction news headline for ticker
  // In-memory cache so repeated logins don't hammer Google News
  let newsCache = { headline: null, fetchedAt: 0 };

  app.get('/v1/api/longtermhire/client/news-ticker', TokenMiddleware(), async (req, res) => {
    try {
      // serve from cache when it's less than 15 minutes old
      if (newsCache.headline && (Date.now() - newsCache.fetchedAt) < 900000) {
        return res.status(200).json({ error: false, data: { headline: newsCache.headline } });
      }
      const https = require('https');
      const url = 'https://news.google.com/rss/search?q=Australian+construction+industry&hl=en-AU&gl=AU&ceid=AU:en';
      
      const data = await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          let body = '';
          response.on('data', function(chunk) { body += chunk; });
          response.on('end', function() { resolve(body); });
          response.on('error', reject);
        }).on('error', reject);
      });

      const titles = [];
      const startTag = '<title>';
      const endTag = '</title>';
      let pos = 0;
      let count = 0;
      while (count < 6) {
        const start = data.indexOf(startTag, pos);
        if (start === -1) break;
        const end = data.indexOf(endTag, start);
        if (end === -1) break;
        let title = data.slice(start + startTag.length, end).replace('<![CDATA[', '').replace(']]>', '').trim();
        pos = end + endTag.length;
        if (title && title !== 'Google News' && title.indexOf('Google') === -1) {
          titles.push(title);
          count++;
        }
      }

      const headline = titles.length > 0 
        ? titles.join('   ★   ')
        : 'Australia construction industry news';

      newsCache = { headline: headline, fetchedAt: Date.now() };
      return res.status(200).json({ error: false, data: { headline: headline } });
    } catch (error) {
      console.error('News ticker error:', error);
      return res.status(200).json({ error: false, data: { headline: 'Australia construction industry — latest news and updates' } });
    }
  });


  // Start a hire for a client equipment assignment
  app.post('/v1/api/longtermhire/super_admin/start-hire/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const startDate = req.body.start_date || new Date().toISOString().slice(0, 10);
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = ?, hire_status = ?, updated_at = ? WHERE id = ?',
        [startDate, 'active', currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Hire started', data: { start_date: startDate, status: 'active' } });
    } catch (error) {
      console.error('Start hire error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });



  // Start a hire for a client equipment assignment
  app.post('/v1/api/longtermhire/super_admin/start-hire/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const startDate = req.body.start_date || new Date().toISOString().slice(0, 10);
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = ?, hire_status = ?, updated_at = ? WHERE id = ?',
        [startDate, 'active', currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Hire started', data: { start_date: startDate, status: 'active' } });
    } catch (error) {
      console.error('Start hire error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // Get hire management data for all clients
  app.get('/v1/api/longtermhire/super_admin/hire-management', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const query = 'SELECT ce.id as assignment_id, ce.client_user_id, ce.equipment_id, ce.discount, ce.discount_type, ce.compounding_discount, ce.compounding_discount_type, ce.custom_base_price, ce.hire_start_date, ce.hire_end_date, ce.hire_status, e.equipment_name, e.equipment_id as equip_code, e.base_price, c.client_name, c.company_name, u.email, COALESCE((SELECT q.produce_quote_for FROM longtermhire_quote q WHERE q.client_user_id = ce.client_user_id AND q.equipment_name IS NULL ORDER BY q.id DESC LIMIT 1), 12) as produce_quote_for FROM longtermhire_client_equipment ce JOIN longtermhire_equipment_item e ON e.id = ce.equipment_id JOIN longtermhire_client c ON c.user_id = ce.client_user_id JOIN longtermhire_user u ON u.id = ce.client_user_id ORDER BY c.company_name, e.equipment_name';
      const results = await sdk.rawQuery(query, []);
      return res.status(200).json({ error: false, data: results });
    } catch (error) {
      console.error('Hire management error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // End a hire for a client equipment assignment
  app.post('/v1/api/longtermhire/super_admin/end-hire/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const endDate = req.body.end_date || new Date().toISOString().slice(0, 10);
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_end_date = ?, hire_status = ?, updated_at = ? WHERE id = ?',
        [endDate, 'completed', currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Hire ended', data: { end_date: endDate, status: 'completed' } });
    } catch (error) {
      console.error('End hire error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Save/update invoice record for a hire month (upsert)
  app.post('/v1/api/longtermhire/super_admin/hire-invoice', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignment_id, month_number, invoice_ref, amount, amount_owing, status } = req.body;
      if (!assignment_id || !month_number) {
        return res.status(400).json({ error: true, message: 'assignment_id and month_number are required' });
      }
      const amt = parseFloat(amount || 0);
      const owing = amount_owing !== undefined && amount_owing !== null ? parseFloat(amount_owing) : amt;
      const st = status || (owing <= 0 ? 'paid' : 'unpaid');
      const today = new Date().toISOString().slice(0, 10);
      await sdk.rawQuery(
        'INSERT INTO longtermhire_hire_invoice (assignment_id, month_number, invoice_ref, amount, amount_owing, invoice_date, status) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE invoice_ref = VALUES(invoice_ref), amount = VALUES(amount), amount_owing = VALUES(amount_owing), status = VALUES(status)',
        [assignment_id, month_number, invoice_ref || null, amt, owing, today, st]
      );
      return res.status(200).json({ error: false, message: 'Invoice saved' });
    } catch (error) {
      console.error('Hire invoice error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // Get invoice records for an assignment
  app.get('/v1/api/longtermhire/super_admin/hire-invoices/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const results = await sdk.rawQuery(
        'SELECT * FROM longtermhire_hire_invoice WHERE assignment_id = ? ORDER BY month_number',
        [req.params.assignmentId]
      );
      return res.status(200).json({ error: false, data: results });
    } catch (error) {
      console.error('Hire invoices fetch error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Restart a completed hire — clears end date, resumes from original start
  app.post('/v1/api/longtermhire/super_admin/restart-hire/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_end_date = NULL, hire_status = ?, updated_at = ? WHERE id = ?',
        ['active', currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Hire restarted' });
    } catch (error) {
      console.error('Restart hire error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Delete a hire — removes invoice records and resets to pending
  app.post('/v1/api/longtermhire/super_admin/delete-hire/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery('DELETE FROM longtermhire_hire_invoice WHERE assignment_id = ?', [assignmentId]);
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = NULL, hire_end_date = NULL, hire_status = ?, updated_at = ? WHERE id = ?',
        ['pending', currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Hire deleted' });
    } catch (error) {
      console.error('Delete hire error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Client-facing: the logged-in client's own hires
  app.get('/v1/api/longtermhire/client/my-hires', TokenMiddleware(), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const query = 'SELECT ce.id as assignment_id, ce.discount, ce.discount_type, ce.compounding_discount, ce.compounding_discount_type, ce.custom_base_price, ce.hire_start_date, ce.hire_end_date, ce.hire_status, e.equipment_name, e.equipment_id as equip_code, e.base_price, COALESCE((SELECT q.produce_quote_for FROM longtermhire_quote q WHERE q.client_user_id = ce.client_user_id AND q.equipment_name IS NULL ORDER BY q.id DESC LIMIT 1), 12) as produce_quote_for FROM longtermhire_client_equipment ce JOIN longtermhire_equipment_item e ON e.id = ce.equipment_id WHERE ce.client_user_id = ? AND ce.hire_status IN (?, ?) ORDER BY e.equipment_name';
      const results = await sdk.rawQuery(query, [req.user_id, 'active', 'completed']);
      return res.status(200).json({ error: false, data: results });
    } catch (error) {
      console.error('My hires error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Edit the start / end dates of a hire
  app.post('/v1/api/longtermhire/super_admin/update-hire-dates/:assignmentId', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { assignmentId } = req.params;
      const startDate = req.body.start_date || null;
      const endDate = req.body.end_date || null;
      if (!startDate) {
        return res.status(400).json({ error: true, message: 'start_date is required' });
      }
      if (endDate && new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ error: true, message: 'End date cannot be before the start date' });
      }
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = ?, hire_end_date = ?, updated_at = ? WHERE id = ?',
        [startDate, endDate, currentTime, assignmentId]
      );
      return res.status(200).json({ error: false, message: 'Dates updated' });
    } catch (error) {
      console.error('Update hire dates error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // All company members with their roles, for grouping in Company Management
  app.get('/v1/api/longtermhire/super_admin/company-members', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const query = 'SELECT m.id, m.company_id, m.user_id, m.member_name, m.member_email, m.member_phone, m.role, c.company_name, c.owner_user_id FROM longtermhire_company_member m JOIN longtermhire_company c ON c.id = m.company_id ORDER BY c.company_name, m.id';
      const results = await sdk.rawQuery(query, []);
      return res.status(200).json({ error: false, data: results });
    } catch (error) {
      console.error('Company members error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });


  // Fleet report — raw data, categorised on the client side
  app.get('/v1/api/longtermhire/super_admin/fleet-report', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');

      const equipment = await sdk.rawQuery('SELECT id, equipment_id, equipment_name, category_name, base_price, ownership_status, created_at FROM longtermhire_equipment_item ORDER BY equipment_id', []);

      const hires = await sdk.rawQuery('SELECT ce.equipment_id, ce.hire_status, ce.hire_start_date, ce.hire_end_date, ce.discount, ce.discount_type, ce.compounding_discount, ce.compounding_discount_type, ce.custom_base_price, c.company_name FROM longtermhire_client_equipment ce LEFT JOIN longtermhire_client c ON c.user_id = ce.client_user_id', []);

      const quotes = await sdk.rawQuery("SELECT equipment_name, company_name, COUNT(*) as quote_count FROM longtermhire_quote WHERE equipment_name IS NOT NULL AND equipment_name <> '' GROUP BY equipment_name, company_name", []);

      return res.status(200).json({ error: false, data: { equipment: equipment, hires: hires, quotes: quotes } });
    } catch (error) {
      console.error('Fleet report error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

};
