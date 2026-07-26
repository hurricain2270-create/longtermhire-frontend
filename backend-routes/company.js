const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const CompanyModel = require("../models/company");
const CompanyMemberModel = require("../models/company_member");

const bcrypt = require("bcryptjs");
const MailService = require("../../../baas/services/MailService");

module.exports = function (app) {
  console.log("Loading company routes...");

  /**
   * Create a new company
   * POST /v1/api/longtermhire/super_admin/company/create
   */
  app.post(
    "/v1/api/longtermhire/super_admin/company/create",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const {
          company_name,
          owner_user_id,
          company_address,
          company_logo,
          header_ad_text,
          sticky_ad_text,
        } = req.body;

        // Validation
        if (!company_name || !owner_user_id) {
          return res.status(400).json({
            error: true,
            message: "Company name and owner user ID are required",
          });
        }

        // Check if owner user exists
        sdk.setTable("user");
        const user = await sdk.rawQuery(
          `SELECT id, email FROM longtermhire_user WHERE id = ? LIMIT 1`,
          [owner_user_id]
        );

        if (!user || user.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Owner user not found",
          });
        }

        // Check if user already has a company as owner
        const companyModel = new CompanyModel(sdk);
        const existingCompany = await companyModel.findByOwnerId(owner_user_id);

        if (existingCompany) {
          return res.status(400).json({
            error: true,
            message: "User already owns a company",
          });
        }

        // Create company
        const company = await companyModel.create({
          company_name,
          owner_user_id,
          company_address,
          company_logo,
          header_ad_text,
          sticky_ad_text,
        });

        // Create company member entry for owner
        const companyMemberModel = new CompanyMemberModel(sdk);
        await companyMemberModel.create({
          company_id: company.insertId || company.id,
          user_id: owner_user_id,
          member_name: user[0].email.split("@")[0], // Use email username as default
          member_email: user[0].email,
          role: "Company Owner",
        });

        return res.status(201).json({
          error: false,
          message: "Company created successfully",
          data: {
            company_id: company.insertId || company.id,
          },
        });
      } catch (error) {
        console.error("Create company error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to create company",
        });
      }
    }
  );

  /**
   * Get company by ID with members
   * GET /v1/api/longtermhire/super_admin/company/:id
   */
  app.get(
    "/v1/api/longtermhire/super_admin/company/:id",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const companyId = req.params.id;
        const companyModel = new CompanyModel(sdk);
        const company = await companyModel.findByIdWithMembers(companyId);

        if (!company) {
          return res.status(404).json({
            error: true,
            message: "Company not found",
          });
        }

        return res.status(200).json({
          error: false,
          data: company,
        });
      } catch (error) {
        console.error("Get company error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to get company",
        });
      }
    }
  );

  /**
   * Update company
   * PUT /v1/api/longtermhire/super_admin/company/:id
   */
  app.put(
    "/v1/api/longtermhire/super_admin/company/:id",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const companyId = req.params.id;
        const { company_name, company_address, company_logo, header_ad_text, sticky_ad_text } =
          req.body;

        const companyModel = new CompanyModel(sdk);

        // Check if company exists
        const company = await companyModel.findById(companyId);
        if (!company) {
          return res.status(404).json({
            error: true,
            message: "Company not found",
          });
        }

        // Update company
        await companyModel.update(companyId, {
          company_name,
          company_address,
          company_logo,
          header_ad_text,
          sticky_ad_text,
        });

        return res.status(200).json({
          error: false,
          message: "Company updated successfully",
        });
      } catch (error) {
        console.error("Update company error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to update company",
        });
      }
    }
  );

  /**
   * Add team member to company
   * POST /v1/api/longtermhire/super_admin/company/:id/member
   */
  app.post(
    "/v1/api/longtermhire/super_admin/company/:id/member",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const companyId = req.params.id;
        const {
          member_name,
          member_email,
          member_phone,
          username,
          password,
          role,
        } = req.body;

        // Validation
        if (!member_name || !member_email || !role) {
          return res.status(400).json({
            error: true,
            message: "Member name, email, and role are required",
          });
        }

        // Check if company exists
        const companyModel = new CompanyModel(sdk);
        const company = await companyModel.findById(companyId);

        if (!company) {
          return res.status(404).json({
            error: true,
            message: "Company not found",
          });
        }

        // If assigning Company Owner role, check if one already exists
        if (role === "Company Owner") {
          const existingOwner = await sdk.rawQuery(
            `SELECT id, member_name FROM longtermhire_company_member 
             WHERE company_id = ? AND role = 'Company Owner' LIMIT 1`,
            [companyId]
          );

          if (existingOwner && existingOwner.length > 0) {
            return res.status(400).json({
              error: true,
              message: `Only one Company Owner is allowed per company. ${existingOwner[0].member_name} is already the Company Owner.`,
            });
          }
        }

        // Check if email already exists ANYWHERE in the database (app-wide uniqueness)
        // Check in longtermhire_user table
        const existingUserCheck = await sdk.rawQuery(
          `SELECT id, email FROM longtermhire_user WHERE email = ? LIMIT 1`,
          [member_email]
        );

        if (existingUserCheck && existingUserCheck.length > 0) {
          // Check if this user is already a team member or client
          const existingMemberCheck = await sdk.rawQuery(
            `SELECT cm.id, cm.company_id, c.company_name 
             FROM longtermhire_company_member cm
             JOIN longtermhire_company c ON c.id = cm.company_id
             WHERE cm.user_id = ? LIMIT 1`,
            [existingUserCheck[0].id]
          );

          if (existingMemberCheck && existingMemberCheck.length > 0) {
            return res.status(400).json({
              error: true,
              message: `This email (${member_email}) is already a team member of ${existingMemberCheck[0].company_name}. Each email can only be used once.`,
            });
          }

          const existingClientCheck = await sdk.rawQuery(
            `SELECT c.id, c.client_name, c.company_name 
             FROM longtermhire_client c
             WHERE c.user_id = ? LIMIT 1`,
            [existingUserCheck[0].id]
          );

          if (existingClientCheck && existingClientCheck.length > 0) {
            return res.status(400).json({
              error: true,
              message: `This email (${member_email}) is already registered as a client (${existingClientCheck[0].client_name}). Each email can only be used once.`,
            });
          }

          // User exists but not as team member or client - still block to prevent conflicts
          return res.status(400).json({
            error: true,
            message: `This email (${member_email}) is already registered in the system. Each email can only be used once.`,
          });
        }

        // Check in longtermhire_company_member table by email
        const existingMemberByEmailCheck = await sdk.rawQuery(
          `SELECT cm.id, cm.company_id, c.company_name 
           FROM longtermhire_company_member cm
           JOIN longtermhire_company c ON c.id = cm.company_id
           WHERE cm.member_email = ? LIMIT 1`,
          [member_email]
        );

        if (
          existingMemberByEmailCheck &&
          existingMemberByEmailCheck.length > 0
        ) {
          return res.status(400).json({
            error: true,
            message: `This email (${member_email}) is already a team member of ${existingMemberByEmailCheck[0].company_name}. Each email can only be used once.`,
          });
        }

        // Check in longtermhire_client table
        const existingClientByEmailCheck = await sdk.rawQuery(
          `SELECT c.id, c.client_name, c.company_name 
           FROM longtermhire_client c
           JOIN longtermhire_user u ON c.user_id = u.id
           WHERE u.email = ? LIMIT 1`,
          [member_email]
        );

        if (
          existingClientByEmailCheck &&
          existingClientByEmailCheck.length > 0
        ) {
          return res.status(400).json({
            error: true,
            message: `This email (${member_email}) is already registered as a client (${existingClientByEmailCheck[0].client_name}). Each email can only be used once.`,
          });
        }

        // Check if email already exists as a user (for reuse logic)
        sdk.setTable("user");
        const existingUser = await sdk.rawQuery(
          `SELECT id FROM longtermhire_user WHERE email = ? LIMIT 1`,
          [member_email]
        );

        let userId;
        let plainPassword; // Declare in outer scope
        let userResult = null; // Declare in outer scope
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        if (existingUser && existingUser.length > 0) {
          // User already exists
          userId = existingUser[0].id;

          // If password is provided, update the existing user's password
          if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await sdk.rawQuery(
              `UPDATE longtermhire_user SET password = ?, updated_at = ? WHERE id = ?`,
              [hashedPassword, currentTime, userId]
            );
            plainPassword = password;
          } else {
            // No password provided for existing user - they should use existing password or reset
            plainPassword =
              "Use your existing password or reset it via forgot password";
          }
        } else {
          // Create new user account
          const generatedUsername =
            username ||
            member_email.split("@")[0] +
            Math.random().toString(36).substring(2, 6);
          const generatedPassword =
            password || Math.random().toString(36).substring(2, 10);
          plainPassword = generatedPassword; // Store the plain password
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);

          const userInsertSQL = `
            INSERT INTO longtermhire_user (email, password, role_id, status, verify, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          userResult = await sdk.rawQuery(userInsertSQL, [
            member_email,
            hashedPassword,
            "member",
            1,
            1,
            currentTime,
            currentTime,
          ]);

          userId = userResult.insertId || userResult.id;
        }

        // Check if user is already a member
        const companyMemberModel = new CompanyMemberModel(sdk);
        const isMember = await companyMemberModel.isMember(companyId, userId);

        if (isMember) {
          return res.status(400).json({
            error: true,
            message: "User is already a member of this company",
          });
        }

        // Add member to company
        await companyMemberModel.create({
          company_id: companyId,
          user_id: userId,
          member_name,
          member_email,
          member_phone,
          role,
        });

        // Send invitation email
        try {
          const config = app.get("configuration");
          const mailService = new MailService(config);
          const loginUrl = "https://www.longtermhire.com/client/login";
          // plainPassword is already defined above

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
                  <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">You have been invited to join a team!</p>
                </div>

                <!-- Welcome Message -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 20px; font-weight: 400;">👋 Hello ${member_name}!</h3>
                  <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                    You have been invited to your company <strong>${company.company_name
            }</strong> by <strong>Long Term Hire</strong>.
                    You have been assigned the role of <strong>${role}</strong>.
                  </p>
                </div>

                <!-- Login Credentials -->
                <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                  <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">🔐 Your Login Credentials</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #E5E5E5; font-weight: 400; font-size: 14px;">Email:</td>
                      <td style="padding: 12px 0; color: #E5E5E5; font-family: monospace; background: #292A2B; padding: 8px 12px; border-radius: 4px; border: 1px solid #444444;">${member_email}</td>
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

          await mailService.send(
            config.mail?.from_mail || "noreply@longtermhire.com",
            member_email,
            `You have been invited to join ${company.company_name} on Long Term Hire`,
            htmlContent
          );
          console.log("📧 Invitation email sent to:", member_email);
        } catch (emailError) {
          console.error("Failed to send invitation email:", emailError);
          // Don't fail the request if email fails, just log it
        }

        // Return password in response so it can be displayed if needed
        // (password is also sent via email)
        return res.status(201).json({
          error: false,
          message: "Team member added successfully",
          data: {
            user_id: userId,
            password: plainPassword, // Include password in response for display
            email: member_email,
          },
        });
      } catch (error) {
        console.error("Add team member error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to add team member",
        });
      }
    }
  );

  /**
   * Delete team member from company
   * DELETE /v1/api/longtermhire/super_admin/company/:companyId/member/:memberId
   */
  app.delete(
    "/v1/api/longtermhire/super_admin/company/:companyId/member/:memberId",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { companyId, memberId } = req.params;

        const companyMemberModel = new CompanyMemberModel(sdk);

        // Check if member exists
        const member = await companyMemberModel.findById(memberId);

        if (!member) {
          return res.status(404).json({
            error: true,
            message: "Team member not found",
          });
        }

        // Don't allow deleting company owner
        if (member.role === "Company Owner") {
          return res.status(400).json({
            error: true,
            message: "Cannot delete company owner",
          });
        }

        // Delete member
        await companyMemberModel.delete(memberId);

        return res.status(200).json({
          error: false,
          message: "Team member deleted successfully",
        });
      } catch (error) {
        console.error("Delete team member error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to delete team member",
        });
      }
    }
  );

  /**
   * Update team member role
   * PUT /v1/api/longtermhire/super_admin/company/:companyId/member/:memberId/role
   */
  app.put(
    "/v1/api/longtermhire/super_admin/company/:companyId/member/:memberId/role",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { companyId, memberId } = req.params;
        const { role } = req.body;

        // Validation
        if (!role) {
          return res.status(400).json({
            error: true,
            message: "Role is required",
          });
        }

        // Validate role value
        const validRoles = ["Company Owner", "Engineer", "Supervisor"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({
            error: true,
            message:
              "Invalid role. Must be one of: Company Owner, Engineer, Supervisor",
          });
        }

        const companyMemberModel = new CompanyMemberModel(sdk);

        // Check if member exists
        const member = await companyMemberModel.findById(memberId);
        if (!member) {
          return res.status(404).json({
            error: true,
            message: "Team member not found",
          });
        }

        // Prevent changing Company Owner role
        if (member.role === "Company Owner") {
          return res.status(400).json({
            error: true,
            message:
              "Cannot change the role of a Company Owner. This role is permanent.",
          });
        }

        // If assigning Company Owner role, check if one already exists
        if (role === "Company Owner") {
          const existingOwner = await sdk.rawQuery(
            `SELECT id, member_name FROM longtermhire_company_member 
             WHERE company_id = ? AND role = 'Company Owner' AND id != ? LIMIT 1`,
            [companyId, memberId]
          );

          if (existingOwner && existingOwner.length > 0) {
            return res.status(400).json({
              error: true,
              message: `Only one Company Owner is allowed per company. ${existingOwner[0].member_name} is already the Company Owner.`,
            });
          }
        }

        // Update role
        await sdk.rawQuery(
          `UPDATE longtermhire_company_member SET role = ?, updated_at = NOW() WHERE id = ?`,
          [role, memberId]
        );

        return res.status(200).json({
          error: false,
          message: "Role updated successfully",
        });
      } catch (error) {
        console.error("Update team member role error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to update role",
        });
      }
    }
  );

  /**
   * Get company equipment with discounts
   * GET /v1/api/longtermhire/super_admin/company/:id/equipment
   */
  app.get(
    "/v1/api/longtermhire/super_admin/company/:id/equipment",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const companyId = req.params.id;
        const companyModel = new CompanyModel(sdk);

        // Check if company exists
        const company = await companyModel.findById(companyId);
        if (!company) {
          return res.status(404).json({
            error: true,
            message: "Company not found",
          });
        }

        // Get equipment
        const equipment = await companyModel.getCompanyEquipment(companyId);

        // Calculate final prices using pricing calculator
        const {
          calculateEquipmentPrice,
        } = require("../utils/pricingCalculator");

        const equipmentWithPrices = equipment.map((eq) => ({
          ...eq,
          final_price: calculateEquipmentPrice(
            eq.base_price,
            eq.discount || 0,
            eq.discount_type || "%",
            eq.compounding_discount || 0,
            eq.compounding_discount_type || "%"
          ),
        }));

        return res.status(200).json({
          error: false,
          data: equipmentWithPrices,
        });
      } catch (error) {
        console.error("Get company equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to get company equipment",
        });
      }
    }
  );

  /**
   * Update equipment discount for company
   * PUT /v1/api/longtermhire/super_admin/company/:companyId/equipment/:equipmentId/discount
   */
  app.put(
    "/v1/api/longtermhire/super_admin/company/:companyId/equipment/:equipmentId/discount",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { companyId, equipmentId } = req.params;
        const {
          discount,
          discount_type,
          compounding_discount,
          compounding_discount_type,
        } = req.body;

        // Validate discounts
        const { validateDiscount } = require("../utils/pricingCalculator");

        if (discount !== undefined) {
          const validation = validateDiscount(discount, discount_type);
          if (!validation.valid) {
            return res.status(400).json({
              error: true,
              message: validation.error,
            });
          }
        }

        if (compounding_discount !== undefined) {
          const validation = validateDiscount(
            compounding_discount,
            compounding_discount_type
          );
          if (!validation.valid) {
            return res.status(400).json({
              error: true,
              message: `Compounding ${validation.error}`,
            });
          }
        }

        // equipmentId can be either numeric ID or equipment code - need to resolve it
        let numericEquipmentId = equipmentId;

        // If equipmentId is not a number, look it up by equipment_id code
        if (isNaN(equipmentId)) {
          const equipment = await sdk.rawQuery(
            `SELECT id FROM longtermhire_equipment_item WHERE equipment_id = ? LIMIT 1`,
            [equipmentId]
          );

          if (!equipment || equipment.length === 0) {
            return res.status(404).json({
              error: true,
              message: "Equipment not found",
            });
          }

          numericEquipmentId = equipment[0].id;
        }

        // Get all client user IDs for this company
        const clients = await sdk.rawQuery(
          `SELECT user_id FROM longtermhire_client WHERE company_id = ?`,
          [companyId]
        );

        if (!clients || clients.length === 0) {
          return res.status(404).json({
            error: true,
            message: "No clients found for this company",
          });
        }

        const userIds = clients.map((c) => c.user_id);
        const userIdPlaceholders = userIds.map(() => "?").join(",");

        // Update discount for all company clients with this equipment
        const updateSQL = `
          UPDATE longtermhire_client_equipment
          SET
            discount = ?,
            discount_type = ?,
            compounding_discount = ?,
            compounding_discount_type = ?,
            custom_base_price = ?,
            updated_at = NOW()
          WHERE client_user_id IN (${userIdPlaceholders})
            AND equipment_id = ?
        `;

        await sdk.rawQuery(updateSQL, [
          discount || 0,
          discount_type || "%",
          compounding_discount || 0,
          compounding_discount_type || "%",
          req.body.base_price || null, // Use null if not provided to respect default
          ...userIds,
          numericEquipmentId,
        ]);

        return res.status(200).json({
          error: false,
          message: "Equipment discount updated successfully",
        });
      } catch (error) {
        console.error("Update equipment discount error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to update equipment discount",
        });
      }
    }
  );

  /**
   * BULK UPDATE - Apply discount to all equipment for a company
   * PUT /v1/api/longtermhire/super_admin/company/:companyId/equipment/bulk-discount
   */
  app.put(
    "/v1/api/longtermhire/super_admin/company/:companyId/equipment/bulk-discount",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { companyId } = req.params;
        const {
          discount,
          discount_type,
          compounding_discount,
          compounding_discount_type,
          equipment_ids, // Optional: array of specific equipment IDs, null = all
        } = req.body;

        // Validate that at least one discount is provided
        if (discount === undefined && compounding_discount === undefined) {
          return res.status(400).json({
            error: true,
            message: "At least one discount value must be provided",
          });
        }

        // Validate discounts if provided
        const { validateDiscount } = require("../utils/pricingCalculator");

        if (discount !== undefined) {
          const validation = validateDiscount(discount, discount_type);
          if (!validation.valid) {
            return res.status(400).json({
              error: true,
              message: validation.error,
            });
          }
        }

        if (compounding_discount !== undefined) {
          const validation = validateDiscount(
            compounding_discount,
            compounding_discount_type
          );
          if (!validation.valid) {
            return res.status(400).json({
              error: true,
              message: `Compounding ${validation.error}`,
            });
          }
        }

        // Get all client user IDs for this company
        const clients = await sdk.rawQuery(
          `SELECT user_id FROM longtermhire_client WHERE company_id = ?`,
          [companyId]
        );

        if (!clients || clients.length === 0) {
          return res.status(404).json({
            error: true,
            message: "No clients found for this company",
          });
        }

        const userIds = clients.map((c) => c.user_id);

        // Build dynamic SQL based on what fields are provided
        let updateFields = [];
        let updateValues = [];

        if (discount !== undefined) {
          updateFields.push("discount = ?");
          updateValues.push(discount || 0);
          updateFields.push("discount_type = ?");
          updateValues.push(discount_type || "%");
        }

        if (compounding_discount !== undefined) {
          updateFields.push("compounding_discount = ?");
          updateValues.push(compounding_discount || 0);
          updateFields.push("compounding_discount_type = ?");
          updateValues.push(compounding_discount_type || "%");
        }

        updateFields.push("updated_at = NOW()");

        // Build WHERE clause with proper placeholders
        const userIdPlaceholders = userIds.map(() => "?").join(",");
        let whereClause = `WHERE client_user_id IN (${userIdPlaceholders})`;
        const whereValues = [...userIds];

        if (
          equipment_ids &&
          Array.isArray(equipment_ids) &&
          equipment_ids.length > 0
        ) {
          const equipmentIdPlaceholders = equipment_ids
            .map(() => "?")
            .join(",");
          whereClause += ` AND equipment_id IN (${equipmentIdPlaceholders})`;
          whereValues.push(...equipment_ids);
        }

        const updateSQL = `
          UPDATE longtermhire_client_equipment
          SET ${updateFields.join(", ")}
          ${whereClause}
        `;

        // Combine update values with where values
        const allValues = [...updateValues, ...whereValues];

        const result = await sdk.rawQuery(updateSQL, allValues);

        return res.status(200).json({
          error: false,
          message: `Discount applied to ${result.affectedRows || 0
            } equipment items successfully`,
          data: {
            affected_rows: result.affectedRows || 0,
          },
        });
      } catch (error) {
        console.error("Bulk update equipment discount error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to update equipment discounts",
        });
      }
    }
  );

  // Get all companies for quote dropdown
  app.get(
    "/v1/api/longtermhire/super_admin/companies/list",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const companiesSQL = `
          SELECT 
            c.id,
            c.company_name,
            c.company_address,
            c.company_logo,
            u.email as owner_email
          FROM longtermhire_company c
          LEFT JOIN longtermhire_user u ON c.owner_user_id = u.id
          ORDER BY c.company_name ASC
        `;

        const companies = await sdk.rawQuery(companiesSQL);

        return res.status(200).json({
          error: false,
          data: companies || [],
        });
      } catch (error) {
        console.error("Get companies list error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to fetch companies",
        });
      }
    }
  );
};
