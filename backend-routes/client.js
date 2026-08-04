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
  // invite-client-test removed - it was an unauthenticated test route
  
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
              <div style="background-color: #1F1F20; padding: 30px; border-radius: 8px; border: 1px solid #333333; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                
                <!-- Header with Logo -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333333;">
                  <img src="https://longtermhire.com/login-logo.png" 
                       alt="Long Term Hire" 
                       style="width: 240px; height: 135px; margin-bottom: 15px;">
                  <h1 style="color: #E5E5E5; margin: 0; font-size: 28px; font-weight: 400;">Welcome to Long Term Hire</h1>
                  <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">Your account is ready</p>
                </div>

                <!-- Welcome Message -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 20px; font-weight: 400;">Hello ${client_name}</h3>
                  <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                    An account has been set up for <strong>${company_name}</strong> on the Long Term Hire
                    portal. From there you can view the equipment available to you, see what is
                    currently on hire, and request additional machinery.
                  </p>
                </div>

                <!-- Login Credentials -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">Your login details</h3>
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
                    Log in
                  </a>
                </div>

              
                <!-- Footer -->
                <div style="border-top: 1px solid #333333; padding-top: 20px; margin-top: 30px; text-align: center;">
                  <p style="color: #ADAEBC; font-size: 14px; margin: 0;">
                    Any questions, contact us at <b>admin@longtermhire.com</b>.<br>
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
              config.mail?.from_mail || "admin@longtermhire.com",
              email,
              `Welcome to Long Term Hire — your account is ready`,
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
    TokenMiddleware(),
    RoleMiddleware(['super_admin']),
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
    TokenMiddleware(),
    RoleMiddleware(['super_admin']),
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
    TokenMiddleware(),
    RoleMiddleware(['super_admin']),
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
    TokenMiddleware(),
    RoleMiddleware(['super_admin']),
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
      const html =
        '<div style="font-family: Inter, Arial, sans-serif; max-width:600px; background:#292A2B; padding:20px;">' +
        '<div style="background:#1F1F20; padding:26px; border-radius:8px; border:1px solid #333333;">' +
        '<p style="margin:0 0 4px; color:#E5E5E5; font-size:22px;">Your login details</p>' +
        '<p style="margin:0 0 20px; color:#ADAEBC; font-size:14px;">Long Term Hire</p>' +
        '<p style="margin:0 0 16px; color:#E5E5E5; font-size:16px;">Hello ' + client_name + '</p>' +
        '<div style="background:#1C1C1C; padding:18px; border-radius:6px; border:1px solid #444; margin-bottom:20px;">' +
        '<p style="margin:0 0 8px; color:#ADAEBC; font-size:13px;">Email: <span style="color:#E5E5E5; font-family:monospace;">' + email + '</span></p>' +
        '<p style="margin:0; color:#ADAEBC; font-size:13px;">Password: <span style="color:#E5E5E5; font-family:monospace;">' + newPassword + '</span></p>' +
        '</div>' +
        '<div style="text-align:center; margin:24px 0;">' +
        '<a href="https://longtermhire.com/client/login" style="background:#FDCE06; color:#1F1F20; padding:13px 28px; border-radius:6px; font-size:14px; font-weight:600; text-decoration:none; display:inline-block;">Log in</a>' +
        '</div>' +
        '<div style="border-top:1px solid #333; padding-top:16px; text-align:center;">' +
        '<p style="margin:0; color:#ADAEBC; font-size:13px;">Any questions, contact us at <b style="color:#E5E5E5;">admin@longtermhire.com</b>.</p>' +
        '</div></div></div>';
      await mailService.send(config.mail && config.mail.from_mail ? config.mail.from_mail : 'admin@longtermhire.com', email, 'Your login details for Long Term Hire', html);
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

      // A machine can sit in more than one client's catalogue, but it can only
      // be physically on hire to one of them. Refuse rather than let the same
      // machine go out twice.
      const clash = await sdk.rawQuery(
        'SELECT c.company_name, ce.hire_start_date FROM longtermhire_client_equipment ce ' +
        'JOIN longtermhire_client c ON c.user_id = ce.client_user_id ' +
        'WHERE ce.equipment_id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND ce.hire_status = 'active' AND ce.id <> ? LIMIT 1",
        [assignmentId, assignmentId]
      );
      if (clash && clash.length > 0) {
        return res.status(409).json({
          error: true,
          message:
            'That machine is already on hire to ' + clash[0].company_name +
            '. End that hire first.',
        });
      }

      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = ?, hire_status = ?, updated_at = ? WHERE id = ?',
        [startDate, 'active', currentTime, assignmentId]
      );

      // Where the machine is actually standing. One machine, one contract, one
      // site — so it lives on the hire rather than in a separate table, and
      // everything downstream reads it from here.
      const site = req.body.site || {};
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET site_name = ?, site_address = ?, ' +
        'site_access = ?, site_contact_name = ?, site_contact_phone = ? WHERE id = ?',
        [site.name || null, site.address || null, site.access || null,
         site.contact_name || null, site.contact_phone || null, assignmentId]
      );

      // The machine is physically gone, so mark it unavailable. Doing it here
      // rather than by hand means it can't be forgotten.
      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item SET availability = 0 ' +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?)',
        [assignmentId]
      );

      // Pencil in when it's due back: hire start plus the minimum term. Only
      // if nothing is set — a date entered by hand, or for a maintenance
      // period, must not be overwritten.
      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item ' +
        "SET unavailability_due_month = DATE_FORMAT(DATE_ADD(?, INTERVAL COALESCE(NULLIF(minimum_duration,0),3) MONTH), '%M %Y') " +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND (unavailability_due_month IS NULL OR unavailability_due_month = '')",
        [startDate, assignmentId]
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

      // A machine can sit in more than one client's catalogue, but it can only
      // be physically on hire to one of them. Refuse rather than let the same
      // machine go out twice.
      const clash = await sdk.rawQuery(
        'SELECT c.company_name, ce.hire_start_date FROM longtermhire_client_equipment ce ' +
        'JOIN longtermhire_client c ON c.user_id = ce.client_user_id ' +
        'WHERE ce.equipment_id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND ce.hire_status = 'active' AND ce.id <> ? LIMIT 1",
        [assignmentId, assignmentId]
      );
      if (clash && clash.length > 0) {
        return res.status(409).json({
          error: true,
          message:
            'That machine is already on hire to ' + clash[0].company_name +
            '. End that hire first.',
        });
      }

      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_start_date = ?, hire_status = ?, updated_at = ? WHERE id = ?',
        [startDate, 'active', currentTime, assignmentId]
      );

      // Where the machine is actually standing. One machine, one contract, one
      // site — so it lives on the hire rather than in a separate table, and
      // everything downstream reads it from here.
      const site = req.body.site || {};
      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET site_name = ?, site_address = ?, ' +
        'site_access = ?, site_contact_name = ?, site_contact_phone = ? WHERE id = ?',
        [site.name || null, site.address || null, site.access || null,
         site.contact_name || null, site.contact_phone || null, assignmentId]
      );

      // The machine is physically gone, so mark it unavailable. Doing it here
      // rather than by hand means it can't be forgotten.
      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item SET availability = 0 ' +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?)',
        [assignmentId]
      );

      // Pencil in when it's due back: hire start plus the minimum term. Only
      // if nothing is set — a date entered by hand, or for a maintenance
      // period, must not be overwritten.
      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item ' +
        "SET unavailability_due_month = DATE_FORMAT(DATE_ADD(?, INTERVAL COALESCE(NULLIF(minimum_duration,0),3) MONTH), '%M %Y') " +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND (unavailability_due_month IS NULL OR unavailability_due_month = '')",
        [startDate, assignmentId]
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


  /**
   * Onboarding. We send a link, the client fills one page on their phone, and
   * it lands here for review. No login on their side — the token in the address
   * is the credential, same as the supplier job pages.
   *
   * POST /super_admin/onboarding/invite   create a link to send
   * GET  /super_admin/onboarding          what has come in
   * POST /super_admin/onboarding/seen      mark what has come in as read
   * GET  /onboarding/:token               the form's own data (public)
   * POST /onboarding/:token               they send it (public)
   */
  app.post('/v1/api/longtermhire/super_admin/onboarding/invite', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { contact_name, email } = req.body;
      if (!email) return res.status(400).json({ error: true, message: 'An email is needed' });

      const token = require('crypto').randomBytes(16).toString('hex');
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const result = await sdk.rawQuery(
        'INSERT INTO longtermhire_onboarding (token, invited_name, invited_email, status, created_at) ' +
        "VALUES (?, ?, ?, 'sent', ?)",
        [token, contact_name || null, email, now]
      );

      const link = 'https://api.longtermhire.com/onboarding/' + token;
      let sent = false;
      try {
        const MailService = require('../../../baas/services/MailService');
        const config = app.get('configuration');
        const mailService = new MailService(config);
        await mailService.send(
          config.mail?.from_mail || 'admin@longtermhire.com',
          email,
          'Setting up your account',
          `<div style="font-family: Inter, Arial, sans-serif; max-width:560px; background:#f6f6f6; padding:16px;">
             <div style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:22px;">
               <h2 style="margin:0 0 3px; font-size:19px; color:#111;">Setting up your account</h2>
               <p style="margin:0 0 16px; color:#666; font-size:13px;">Long Term Hire</p>
               <p style="margin:0 0 14px; font-size:14px; color:#333; line-height:1.6;">Hello ${contact_name || 'there'},</p>
               <p style="margin:0 0 16px; font-size:14px; color:#333; line-height:1.6;">
                 Everything we need is on one page. It takes about two minutes and you can do it on your phone.</p>
               <a href="${link}" style="display:block; text-align:center; background:#1b8a3a; color:#fff; padding:15px; border-radius:6px; font-size:16px; font-weight:600; text-decoration:none;">Open the form</a>
               <p style="margin:12px 0 0; font-size:12px; color:#888;">Nothing to log into. The link is yours and stays live for 30 days.</p>
             </div>
           </div>`
        );
        sent = true;
      } catch (mailErr) {
        console.error('Onboarding invite email failed:', mailErr);
      }

      return res.status(200).json({ error: false, data: { id: result.insertId, link, sent } });
    } catch (error) {
      console.error('Onboarding invite error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.get('/v1/api/longtermhire/super_admin/onboarding', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const rows = await sdk.rawQuery(
        'SELECT id, token, invited_name, invited_email, status, business_name, abn, ' +
        'street, suburb, state, postcode, contact_name, contact_role, contact_mobile, people, ' +
        'created_at, submitted_at FROM longtermhire_onboarding ORDER BY id DESC', []
      );
      return res.status(200).json({
        error: false,
        data: (rows || []).map((r) => {
          let people = [];
          try {
            people = Array.isArray(r.people) ? r.people : JSON.parse(r.people || '[]');
          } catch (e) { people = []; }
          return Object.assign({}, r, { people });
        }),
      });
    } catch (error) {
      console.error('Onboarding list error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // The form itself. Public — the token is the credential.
  app.get('/v1/api/longtermhire/onboarding/:token', async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const rows = await sdk.rawQuery(
        'SELECT invited_name, status FROM longtermhire_onboarding WHERE token = ? LIMIT 1',
        [req.params.token]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: 'not_found' });
      return res.status(200).json({ error: false, data: rows[0] });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.post('/v1/api/longtermhire/onboarding/:token', async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { business_name, abn, street, suburb, state, postcode,
              contact_name, contact_role, contact_mobile, people } = req.body;
      if (!business_name || !contact_name) {
        return res.status(400).json({ error: true, message: 'A business name and your name are needed' });
      }

      const rows = await sdk.rawQuery(
        "SELECT id, status FROM longtermhire_onboarding WHERE token = ? LIMIT 1", [req.params.token]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: 'not_found' });
      if (rows[0].status === 'created') {
        return res.status(400).json({ error: true, message: 'already_done' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await sdk.rawQuery(
        "UPDATE longtermhire_onboarding SET business_name = ?, abn = ?, street = ?, " +
        "suburb = ?, state = ?, postcode = ?, contact_name = ?, contact_role = ?, " +
        "contact_mobile = ?, people = ?, status = 'submitted', submitted_at = ? WHERE token = ?",
        [business_name, abn || null, street || null, suburb || null, state || null,
         postcode || null, contact_name, contact_role || null, contact_mobile || null,
         JSON.stringify(Array.isArray(people) ? people : []), now, req.params.token]
      );

      // Tell whoever reads our mail that something has come in.
      try {
        const MailService = require('../../../baas/services/MailService');
        const config = app.get('configuration');
        const mailService = new MailService(config);
        const to = process.env.ADMIN_NOTIFY_EMAIL || config.mail?.from_mail;
        if (to) {
          await mailService.send(
            config.mail?.from_mail || 'admin@longtermhire.com', to,
            'Account details received — ' + business_name,
            `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#111;">
               <p><b>${business_name}</b> has sent their details.</p>
               <p>${contact_name}${contact_role ? ' · ' + contact_role : ''}${contact_mobile ? ' · ' + contact_mobile : ''}</p>
               <p style="color:#666;font-size:13px;">Review it under Client Management, Submissions.</p>
             </div>`
          );
        }
      } catch (mailErr) {
        console.error('Onboarding notification failed:', mailErr);
      }

      return res.status(200).json({ error: false, message: 'Thanks' });
    } catch (error) {
      console.error('Onboarding submit error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // Opening the list marks everything in it as seen. The chip is an indicator,
  // not a workflow — the company still gets created by hand from the details.
  app.post('/v1/api/longtermhire/super_admin/onboarding/seen', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      await sdk.rawQuery(
        "UPDATE longtermhire_onboarding SET status = 'seen' WHERE status = 'submitted'", []
      );
      return res.status(200).json({ error: false, message: 'Marked as seen' });
    } catch (error) {
      console.error('Onboarding seen error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // The onboarding form itself, served as plain HTML. No bundle to download on
  // a phone at the back of a site, and nothing to log into.
  app.get('/onboarding/:token', async (req, res) => {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    let row = null;
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const rows = await sdk.rawQuery(
        'SELECT invited_name, status FROM longtermhire_onboarding WHERE token = ? LIMIT 1',
        [req.params.token]
      );
      row = rows && rows.length ? rows[0] : null;
    } catch (e) {
      console.error('onboarding page error', e);
    }

    const shell = (inner) => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setting up your account — Long Term Hire</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#292A2B;font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#E5E5E5;padding:16px}
.card{max-width:480px;margin:0 auto;background:#1F1F20;border:1px solid #333333;border-radius:14px;padding:22px 18px 26px}
.brand{font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin:0 0 2px}
h1{font-size:21px;font-weight:600;margin:0 0 4px;color:#E5E5E5}
.lede{color:#9CA3AF;font-size:14px;margin:0 0 22px}
.band{color:#FDCE06;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:22px 0 10px}
label{display:block;color:#9CA3AF;font-size:13px;margin:0 0 5px}
.hint{color:#6B7280;font-size:13px;margin:-4px 0 12px}
input{width:100%;font:inherit;padding:12px 13px;border:1px solid #333333;border-radius:8px;background:#292A2B;color:#E5E5E5;margin-bottom:12px}
input:focus{outline:none;border-color:#FDCE06}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.person{background:#292A2B;border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:8px}
.person input{background:#1F1F20;margin-bottom:8px}
.roles{display:flex;gap:5px;flex-wrap:wrap;margin-top:2px}
.role{background:#292A2B;border:1px solid #333;color:#9CA3AF;padding:6px 12px;border-radius:999px;font-size:13px;cursor:pointer}
.role.on{background:#FDCE06;border-color:#FDCE06;color:#1F1F20;font-weight:600}
.person .role{background:#1F1F20}
.person .role.on{background:#FDCE06}
.add{display:block;width:100%;text-align:center;border:1px dashed #444;background:none;color:#9CA3AF;padding:12px;border-radius:8px;font:inherit;cursor:pointer;margin-bottom:20px}
.go{display:block;width:100%;background:#FDCE06;border:none;color:#1F1F20;padding:16px;border-radius:8px;font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.go[disabled]{opacity:.4}
.warn{color:#F59E0B;font-size:12px;margin:8px 0 0}
.err{color:#ef4444;font-size:14px;margin:12px 0 0;min-height:1px}
.done{text-align:center;padding:20px 0}
.tick{width:48px;height:48px;border-radius:50%;background:#14352a;color:#4CAF50;font-size:24px;line-height:48px;margin:0 auto 14px}
.rm{float:right;color:#6B7280;background:none;border:none;font-size:18px;cursor:pointer;padding:0 2px}
</style></head><body>${inner}</body></html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');

    if (!row) {
      return res.send(shell(`<div class="card"><p class="brand">Long Term Hire</p>
        <h1>This link isn't valid</h1>
        <p class="lede">Give us a ring and we'll send you another one.</p></div>`));
    }
    if (row.status === 'submitted' || row.status === 'created') {
      return res.send(shell(`<div class="card"><div class="done">
        <div class="tick">&#10003;</div>
        <h1>Already received</h1>
        <p class="lede">Thanks — we have your details. We'll be in touch shortly.</p>
      </div></div>`));
    }

    const ROLES = ['Owner', 'Engineer', 'Supervisor'];
    const roleChips = (idx) => ROLES.map((r) =>
      `<button type="button" class="role" data-p="${idx}" data-role="${r}" onclick="pickRole(this)">${r}</button>`
    ).join('');

    return res.send(shell(`<div class="card">
      <p class="brand">Long Term Hire</p>
      <h1>Setting up your account</h1>
      <p class="lede">Three short bits. Two minutes.</p>

      <p class="band">Your business</p>
      <label for="business">Business name</label>
      <input id="business" autocomplete="organization" />
      <label for="abn">ABN <span style="color:#6B7280">if handy</span></label>
      <input id="abn" inputmode="numeric" />
      <label for="street">Number and street</label>
      <input id="street" autocomplete="address-line1" />
      <div class="two">
        <div><label for="suburb">Suburb or town</label><input id="suburb" autocomplete="address-level2" /></div>
        <div><label for="postcode">Postcode</label><input id="postcode" inputmode="numeric" autocomplete="postal-code" /></div>
      </div>
      <label for="state">State</label>
      <input id="state" autocomplete="address-level1" placeholder="QLD" />

      <p class="band">You</p>
      <div class="two">
        <div><label for="cname">Name</label><input id="cname" autocomplete="name" /></div>
        <div><label for="cmobile">Mobile</label><input id="cmobile" inputmode="tel" autocomplete="tel" /></div>
      </div>
      <label>Your role</label>
      <div class="roles" id="myrole">${roleChips('me')}</div>
      <div style="height:14px"></div>

      <p class="band">Who else needs a login</p>
      <p class="hint">We need a role for each one — it decides what they see.</p>
      <div id="people"></div>
      <button type="button" class="add" onclick="addPerson()">+ Add someone</button>

      <button type="button" class="go" id="go" onclick="send()">Send it</button>
      <p class="err" id="err"></p>
    </div>

<script>
var TOKEN = ${JSON.stringify(req.params.token)};
var API = "https://api.longtermhire.com";
var n = 0;
function q(id){ return document.getElementById(id); }
function pickRole(btn){
  var p = btn.getAttribute("data-p");
  var all = document.querySelectorAll('[data-p="' + p + '"]');
  for (var i=0;i<all.length;i++) all[i].classList.remove("on");
  btn.classList.add("on");
  var w = q("warn-" + p); if (w) w.textContent = "";
}
function roleOf(p){
  var on = document.querySelector('[data-p="' + p + '"].on');
  return on ? on.getAttribute("data-role") : "";
}
function addPerson(){
  n++;
  var d = document.createElement("div");
  d.className = "person";
  d.id = "p-" + n;
  d.innerHTML =
    '<button type="button" class="rm" onclick="this.parentNode.remove()">&times;</button>' +
    '<input placeholder="Name" id="pn-' + n + '" />' +
    '<input placeholder="Email" inputmode="email" id="pe-' + n + '" />' +
    '<div class="roles">' +
      ${JSON.stringify(ROLES)}.map(function(r){
        return '<button type="button" class="role" data-p="' + n + '" data-role="' + r + '" onclick="pickRole(this)">' + r + '</button>';
      }).join("") +
    '</div><p class="warn" id="warn-' + n + '"></p>';
  q("people").appendChild(d);
}
function send(){
  q("err").textContent = "";
  var business = q("business").value.trim();
  var cname = q("cname").value.trim();
  if (!business) { q("err").textContent = "We need the business name."; return; }
  if (!cname) { q("err").textContent = "We need your name."; return; }
  if (!roleOf("me")) { q("err").textContent = "Pick your role."; return; }

  var people = [], missing = null;
  var rows = document.querySelectorAll(".person");
  for (var i=0;i<rows.length;i++){
    var id = rows[i].id.split("-")[1];
    var nm = q("pn-" + id).value.trim();
    var em = q("pe-" + id).value.trim();
    if (!nm && !em) continue;
    var rl = roleOf(id);
    if (!rl) { q("warn-" + id).textContent = "Pick a role for " + (nm || "this person"); missing = id; continue; }
    people.push({ name: nm, email: em, role: rl });
  }
  if (missing) { q("err").textContent = "Everyone needs a role."; return; }

  q("go").disabled = true;
  q("go").textContent = "Sending...";
  fetch(API + "/v1/api/longtermhire/onboarding/" + TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      business_name: business,
      abn: q("abn").value.trim(),
      street: q("street").value.trim(),
      suburb: q("suburb").value.trim(),
      state: q("state").value.trim(),
      postcode: q("postcode").value.trim(),
      contact_name: cname,
      contact_role: roleOf("me"),
      contact_mobile: q("cmobile").value.trim(),
      people: people
    })
  }).then(function(r){ return r.json(); }).then(function(j){
    if (j.error) { throw new Error(j.message || "failed"); }
    document.querySelector(".card").innerHTML =
      '<div class="done"><div class="tick">&#10003;</div>' +
      '<h1>Thanks, that&#39;s sent</h1>' +
      '<p class="lede">We have everything we need. We&#39;ll be in touch shortly.</p></div>';
  }).catch(function(){
    q("go").disabled = false;
    q("go").textContent = "Send it";
    q("err").textContent = "That didn't send. Give it another go, or ring us.";
  });
}
</script>`));
  });

  /**
   * Suppliers who fix things, and which machines they cover.
   * GET    /v1/api/longtermhire/super_admin/suppliers
   * POST   /v1/api/longtermhire/super_admin/suppliers
   * PUT    /v1/api/longtermhire/super_admin/suppliers/:id
   * DELETE /v1/api/longtermhire/super_admin/suppliers/:id
   * POST   /v1/api/longtermhire/super_admin/suppliers/:id/machines
   */
  app.get('/v1/api/longtermhire/super_admin/suppliers', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');

      // Trade comes from supplier_coverage (supplier x trade x region), which
      // is the designed model — a supplier can cover more than one trade.
      const suppliers = await sdk.rawQuery(
        'SELECT s.id, s.name AS business_name, s.contact_name, s.phone AS mobile, ' +
        's.after_hours_phone, s.email, s.notes, sc.trade_id, t.name AS trade ' +
        'FROM longtermhire_supplier s ' +
        'LEFT JOIN longtermhire_supplier_coverage sc ON sc.supplier_id = s.id AND sc.active = 1 ' +
        'LEFT JOIN longtermhire_trade t ON t.id = sc.trade_id ' +
        'WHERE s.active = 1 ORDER BY t.name, s.name', []
      );
      // The real trade list, rather than anything hardcoded in the app.
      const trades = await sdk.rawQuery(
        'SELECT id, name FROM longtermhire_trade WHERE active = 1 ORDER BY name', []
      );
      const links = await sdk.rawQuery(
        'SELECT es.supplier_id, es.equipment_id, e.equipment_id AS plant_code, e.equipment_name ' +
        'FROM longtermhire_equipment_supplier es ' +
        'JOIN longtermhire_equipment_item e ON e.id = es.equipment_id', []
      );
      // Machines, with whether automatic dispatch is switched on for each.
      const machines = await sdk.rawQuery(
        'SELECT id, equipment_id AS plant_code, equipment_name, category_name, ' +
        'COALESCE(auto_dispatch, 0) AS auto_dispatch FROM longtermhire_equipment_item ' +
        'ORDER BY equipment_name', []
      );

      return res.status(200).json({
        error: false,
        data: { suppliers: suppliers || [], links: links || [], machines: machines || [], trades: trades || [] },
      });
    } catch (error) {
      console.error('Suppliers error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.post('/v1/api/longtermhire/super_admin/suppliers', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      // This table came with the original build. Using its columns rather than
      // inventing parallel ones: name, phone, after_hours_phone, abn are all
      // already there and worth having.
      const { trade_id, business_name, contact_name, mobile, after_hours_phone,
              email, notes } = req.body;
      if (!trade_id || !business_name) {
        return res.status(400).json({ error: true, message: 'A trade and a business name are needed' });
      }
      const result = await sdk.rawQuery(
        'INSERT INTO longtermhire_supplier ' +
        '(name, contact_name, phone, after_hours_phone, email, notes, active) ' +
        'VALUES (?, ?, ?, ?, ?, ?, 1)',
        [business_name, contact_name || null, mobile || null,
         after_hours_phone || null, email || null, notes || null]
      );
      // Against the default region for now — regions exist but nothing is
      // assigned to them, so everyone covers "All areas".
      const region = await sdk.rawQuery(
        'SELECT id FROM longtermhire_region WHERE is_default = 1 AND active = 1 LIMIT 1', []
      );
      await sdk.rawQuery(
        'INSERT INTO longtermhire_supplier_coverage (supplier_id, trade_id, region_id, priority, active) ' +
        'VALUES (?, ?, ?, 1, 1)',
        [result.insertId, trade_id, region && region.length ? region[0].id : 1]
      );
      return res.status(200).json({ error: false, data: { id: result.insertId } });
    } catch (error) {
      console.error('Add supplier error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.put('/v1/api/longtermhire/super_admin/suppliers/:id', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { trade_id, business_name, contact_name, mobile, after_hours_phone,
              email, notes } = req.body;
      await sdk.rawQuery(
        'UPDATE longtermhire_supplier SET name = COALESCE(?, name), contact_name = ?, ' +
        'phone = ?, after_hours_phone = ?, email = ?, notes = ? WHERE id = ?',
        [business_name || null, contact_name || null, mobile || null,
         after_hours_phone || null, email || null, notes || null, req.params.id]
      );
      if (trade_id) {
        const region = await sdk.rawQuery(
          'SELECT id FROM longtermhire_region WHERE is_default = 1 AND active = 1 LIMIT 1', []
        );
        await sdk.rawQuery(
          'DELETE FROM longtermhire_supplier_coverage WHERE supplier_id = ?', [req.params.id]
        );
        await sdk.rawQuery(
          'INSERT INTO longtermhire_supplier_coverage (supplier_id, trade_id, region_id, priority, active) ' +
          'VALUES (?, ?, ?, 1, 1)',
          [req.params.id, trade_id, region && region.length ? region[0].id : 1]
        );
      }
      return res.status(200).json({ error: false, message: 'Saved' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.delete('/v1/api/longtermhire/super_admin/suppliers/:id', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      await sdk.rawQuery('DELETE FROM longtermhire_equipment_supplier WHERE supplier_id = ?', [req.params.id]);
      await sdk.rawQuery('DELETE FROM longtermhire_supplier_coverage WHERE supplier_id = ?', [req.params.id]);
      await sdk.rawQuery('DELETE FROM longtermhire_supplier WHERE id = ?', [req.params.id]);
      return res.status(200).json({ error: false, message: 'Removed' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // Which machines this supplier covers. Sent as a full list each time, so a
  // machine moving to another area is just a re-tick rather than a diff.
  app.post('/v1/api/longtermhire/super_admin/suppliers/:id/machines', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const ids = Array.isArray(req.body.equipment_ids) ? req.body.equipment_ids : [];
      await sdk.rawQuery('DELETE FROM longtermhire_equipment_supplier WHERE supplier_id = ?', [req.params.id]);
      for (const eid of ids) {
        await sdk.rawQuery(
          'INSERT INTO longtermhire_equipment_supplier (supplier_id, equipment_id) VALUES (?, ?)',
          [req.params.id, eid]
        );
      }
      return res.status(200).json({ error: false, message: 'Saved' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  // The go switch, per machine.
  app.put('/v1/api/longtermhire/super_admin/equipment/:id/auto-dispatch', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item SET auto_dispatch = ? WHERE id = ?',
        [req.body.auto_dispatch ? 1 : 0, req.params.id]
      );
      return res.status(200).json({ error: false, message: 'Saved' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  /**
   * Prices we have learnt about the market.
   * GET  /v1/api/longtermhire/super_admin/price-history
   * POST /v1/api/longtermhire/super_admin/price-history
   *
   * Nobody publishes long term dry hire rates, so the only way to know the
   * market is to write down what we pick up in conversation. Stored against a
   * category rather than a machine — a price learnt about someone else's bus
   * still helps price ours.
   */
  app.get('/v1/api/longtermhire/super_admin/price-history', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');

      const rows = await sdk.rawQuery(
        'SELECT id, category_name, monthly_price, applied_period, applied_date, source, note, created_at ' +
        'FROM longtermhire_price_history ORDER BY applied_date DESC, id DESC',
        []
      );

      // The categories we actually hire out, so the dropdown matches the fleet.
      const cats = await sdk.rawQuery(
        'SELECT DISTINCT category_name FROM longtermhire_equipment_item ' +
        "WHERE category_name IS NOT NULL AND category_name <> '' ORDER BY category_name",
        []
      );

      // What we currently ask, per category, to sit beside what we have learnt.
      const asking = await sdk.rawQuery(
        'SELECT category_name, AVG(base_price) AS asking FROM longtermhire_equipment_item ' +
        "WHERE category_name IS NOT NULL AND base_price > 0 GROUP BY category_name",
        []
      );

      // Miscellaneous is not a real category — it is somewhere to put a price
      // learnt on the phone before there is time to work out where it belongs.
      const categories = (cats || []).map((c) => c.category_name);
      categories.push('Miscellaneous');

      return res.status(200).json({
        error: false,
        data: {
          prices: rows || [],
          categories: categories,
          asking: asking || [],
        },
      });
    } catch (error) {
      console.error('Price history error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.post('/v1/api/longtermhire/super_admin/price-history', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');

      const { category_name, monthly_price, applied_period, source, note } = req.body;
      if (!category_name || !monthly_price) {
        return res.status(400).json({ error: true, message: 'A category and a price are needed' });
      }

      // "2 years ago" is as precise as anyone remembers. Turn the rough period
      // into a date so it can be sorted and charted, but keep the words too.
      const MONTHS_BACK = {
        now: 0, '3 months ago': 3, '6 months ago': 6, 'a year ago': 12,
        '2 years ago': 24, '3 years ago': 36, 'longer ago': 60,
      };
      const back = MONTHS_BACK[applied_period] != null ? MONTHS_BACK[applied_period] : 0;
      const d = new Date();
      d.setMonth(d.getMonth() - back);
      const appliedDate = d.toISOString().slice(0, 10);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const result = await sdk.rawQuery(
        'INSERT INTO longtermhire_price_history ' +
        '(category_name, monthly_price, applied_period, applied_date, source, note, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        [category_name, parseFloat(monthly_price) || 0, applied_period || 'now',
         appliedDate, source || 'owner told me', note || null, now]
      );

      return res.status(200).json({ error: false, data: { id: result.insertId } });
    } catch (error) {
      console.error('Add price error:', error);
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.put('/v1/api/longtermhire/super_admin/price-history/:id', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      const { category_name, note } = req.body;
      await sdk.rawQuery(
        'UPDATE longtermhire_price_history SET category_name = COALESCE(?, category_name), ' +
        'note = COALESCE(?, note) WHERE id = ?',
        [category_name || null, note != null ? note : null, req.params.id]
      );
      return res.status(200).json({ error: false, message: 'Updated' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  app.delete('/v1/api/longtermhire/super_admin/price-history/:id', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');
      await sdk.rawQuery('DELETE FROM longtermhire_price_history WHERE id = ?', [req.params.id]);
      return res.status(200).json({ error: false, message: 'Removed' });
    } catch (error) {
      return res.status(500).json({ error: true, message: error.message });
    }
  });

  /**
   * Monthly turnover history, worked out from the hires themselves.
   * GET /v1/api/longtermhire/super_admin/turnover
   *
   * A machine's rate falls each month it stays on site, so the figure for any
   * given month depends on how long each hire had been running by then. The
   * maths mirrors the client-side term calculator so the dashboard and the
   * client portal can never disagree.
   */
  app.get('/v1/api/longtermhire/super_admin/turnover', TokenMiddleware(), RoleMiddleware(['super_admin']), async (req, res) => {
    try {
      const sdk = app.get('sdk');
      sdk.setProjectId('longtermhire');

      const rows = await sdk.rawQuery(
        'SELECT ce.hire_start_date, ce.hire_end_date, ce.hire_status, ' +
        'ce.discount, ce.discount_type, ce.compounding_discount, ce.compounding_discount_type, ' +
        'ce.custom_base_price, e.base_price ' +
        'FROM longtermhire_client_equipment ce ' +
        'JOIN longtermhire_equipment_item e ON e.id = ce.equipment_id ' +
        "WHERE ce.hire_start_date IS NOT NULL AND ce.hire_start_date <> '0000-00-00'",
        []
      );

      const monthKey = (d) => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
      const monthsBetween = (a, b) =>
        (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

      const now = new Date();
      const thisMonth = monthKey(now);
      const totals = {};

      (rows || []).forEach((r) => {
        const start = new Date(r.hire_start_date);
        if (isNaN(start.getTime())) return;

        // An open hire runs to today; a finished one to its end date.
        const end = r.hire_end_date ? new Date(r.hire_end_date) : now;
        const last = isNaN(end.getTime()) || end > now ? now : end;

        const base = parseFloat(r.custom_base_price || r.base_price || 0);
        if (!base) return;
        const disc = parseFloat(r.discount || 0);
        const dType = r.discount_type;
        const comp = parseFloat(r.compounding_discount || 0);
        const cType = r.compounding_discount_type;

        let rate = base;
        if (dType === '%' || dType === 'percentage') rate = rate - (rate * disc) / 100;
        else if (disc > 0) rate = rate - disc;

        const span = monthsBetween(start, last);
        for (let i = 0; i <= span; i++) {
          const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
          const key = monthKey(d);
          totals[key] = (totals[key] || 0) + Math.max(0, rate);
          if (comp > 0) {
            rate = cType === '%' || cType === 'percentage' ? rate - (rate * comp) / 100 : rate - comp;
          }
          rate = Math.max(0, rate);
        }
      });

      const months = Object.keys(totals).sort().map((k) => ({
        month: k,
        total: Math.round(totals[k]),
      }));

      // The best month sets the top of the dial. Exclude the month in progress
      // so a part-month can't become the target it is measured against.
      const past = months.filter((m) => m.month !== thisMonth);
      const best = past.reduce((a, m) => (m.total > a.total ? m : a), { month: null, total: 0 });
      const current = totals[thisMonth] ? Math.round(totals[thisMonth]) : 0;

      return res.status(200).json({
        error: false,
        data: {
          current_month: thisMonth,
          current: current,
          best_month: best.month,
          best: best.total,
          percent: best.total > 0 ? Math.round((current / best.total) * 100) : 0,
          months: months,
        },
      });
    } catch (error) {
      console.error('Turnover error:', error);
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

      // Back on the shelf — but only if no other client still has it out.
      const stillOut = await sdk.rawQuery(
        'SELECT id FROM longtermhire_client_equipment ' +
        'WHERE equipment_id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND hire_status = 'active' AND id <> ? LIMIT 1",
        [assignmentId, assignmentId]
      );
      if (!stillOut || stillOut.length === 0) {
        await sdk.rawQuery(
          'UPDATE longtermhire_equipment_item SET availability = 1, unavailability_due_month = NULL ' +
          'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?)',
          [assignmentId]
        );
      }
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

      // Same rule as starting a hire — the machine may have gone out to someone
      // else while this one was ended.
      const clash = await sdk.rawQuery(
        'SELECT c.company_name FROM longtermhire_client_equipment ce ' +
        'JOIN longtermhire_client c ON c.user_id = ce.client_user_id ' +
        'WHERE ce.equipment_id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND ce.hire_status = 'active' AND ce.id <> ? LIMIT 1",
        [assignmentId, assignmentId]
      );
      if (clash && clash.length > 0) {
        return res.status(409).json({
          error: true,
          message:
            'That machine is already on hire to ' + clash[0].company_name +
            '. End that hire first.',
        });
      }

      await sdk.rawQuery(
        'UPDATE longtermhire_client_equipment SET hire_end_date = NULL, hire_status = ?, updated_at = ? WHERE id = ?',
        ['active', currentTime, assignmentId]
      );

      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item SET availability = 0 ' +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?)',
        [assignmentId]
      );

      await sdk.rawQuery(
        'UPDATE longtermhire_equipment_item ' +
        "SET unavailability_due_month = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL COALESCE(NULLIF(minimum_duration,0),3) MONTH), '%M %Y') " +
        'WHERE id = (SELECT equipment_id FROM longtermhire_client_equipment WHERE id = ?) ' +
        "AND (unavailability_due_month IS NULL OR unavailability_due_month = '')",
        [assignmentId]
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
